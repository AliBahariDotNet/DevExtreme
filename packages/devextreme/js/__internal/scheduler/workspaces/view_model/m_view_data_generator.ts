import dateUtils from '@js/core/utils/date';
import { dateUtilsTs } from '@ts/core/utils/date';
import {
  calculateCellIndex,
  calculateDayDuration,
  getDisplayedCellCount,
  getDisplayedRowCount, getGroupCount,
  getIsGroupedAllDayPanel,
  getKeyByGroup,
  getStartViewDateWithoutDST,
  getTotalCellCountByCompleteData,
  getTotalRowCountByCompleteData,
  isHorizontalView,
} from '@ts/scheduler/r1/utils/index';

import { HORIZONTAL_GROUP_ORIENTATION } from '../../m_constants';
import timezoneUtils from '../../m_utils_time_zone';
import { getAllGroups } from '../../resources/m_utils';

const toMs = dateUtils.dateToMilliseconds;

export class ViewDataGenerator {
  readonly daysInInterval: number = 1;

  readonly isWorkView: boolean = false;

  tableAllDay = false;

  hiddenInterval: any;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSkippedDate(date: any) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _calculateStartViewDate(options: any) {}

  getStartViewDate(options): any {
    return this._calculateStartViewDate(options);
  }

  getCompleteViewDataMap(options: any): any {
    const {
      groups,
      isGroupedByDate,
      isHorizontalGrouping,
      isVerticalGrouping,
      intervalCount,
      currentDate,
      viewType,
      startDayHour,
      endDayHour,
      hoursInterval,
    } = options;

    this._setVisibilityDates(options);
    this.setHiddenInterval(startDayHour, endDayHour, hoursInterval);

    const groupsList = getAllGroups(groups);
    const cellCountInGroupRow = this.getCellCount({
      intervalCount,
      currentDate,
      viewType,
      startDayHour,
      endDayHour,
      hoursInterval,
    });
    const rowCountInGroup = this.getRowCount({
      intervalCount,
      currentDate,
      viewType,
      hoursInterval,
      startDayHour,
      endDayHour,
    });

    let viewDataMap: any[] = [];
    const allDayPanelData = this._generateAllDayPanelData(
      options,
      rowCountInGroup,
      cellCountInGroupRow,
    );
    const viewCellsData = this._generateViewCellsData(
      options,
      rowCountInGroup,
      cellCountInGroupRow,
    );

    if (allDayPanelData) {
      viewDataMap.push(allDayPanelData);
    }

    viewDataMap.push(...viewCellsData);

    if (isHorizontalGrouping && !isGroupedByDate) {
      viewDataMap = this._transformViewDataMapForHorizontalGrouping(viewDataMap, groupsList);
    }

    if (isVerticalGrouping) {
      viewDataMap = this._transformViewDataMapForVerticalGrouping(viewDataMap, groupsList);
    }

    if (isGroupedByDate) {
      viewDataMap = this._transformViewDataMapForGroupingByDate(viewDataMap, groupsList);
    }

    return this._addKeysToCells(viewDataMap);
  }

  _transformViewDataMapForHorizontalGrouping(viewDataMap, groupsList) {
    const result = viewDataMap.map((row) => row.slice());

    groupsList.slice(1).forEach((groups, index) => {
      const groupIndex = index + 1;

      viewDataMap.forEach((row, rowIndex) => {
        const nextGroupRow = row.map((cellData) => ({
          ...cellData,
          groups,
          groupIndex,
        }));

        result[rowIndex].push(...nextGroupRow);
      });
    });

    return result;
  }

  _transformViewDataMapForVerticalGrouping(viewDataMap, groupsList) {
    const result = viewDataMap.map((row) => row.slice());

    groupsList.slice(1).forEach((groups, index) => {
      const groupIndex = index + 1;

      const nextGroupMap = viewDataMap.map((cellsRow) => {
        const nextRow = cellsRow.map((cellData) => ({
          ...cellData,
          groupIndex,
          groups,
        }));

        return nextRow;
      });

      result.push(...nextGroupMap);
    });

    return result;
  }

  _transformViewDataMapForGroupingByDate(viewDataMap, groupsList) {
    const correctedGroupList = groupsList.slice(1);
    const correctedGroupCount = correctedGroupList.length;

    const result = viewDataMap.map((cellsRow) => {
      const groupedByDateCellsRow = cellsRow.reduce((currentRow, cell) => {
        const rowWithCurrentCell = [
          ...currentRow,
          {
            ...cell,
            isFirstGroupCell: true,
            isLastGroupCell: correctedGroupCount === 0,
          },
          ...correctedGroupList.map((groups, index) => ({
            ...cell,
            groups,
            groupIndex: index + 1,
            isFirstGroupCell: false,
            isLastGroupCell: index === correctedGroupCount - 1,
          })),
        ];

        return rowWithCurrentCell;
      }, []);

      return groupedByDateCellsRow;
    });

    return result;
  }

  _addKeysToCells(viewDataMap) {
    const totalColumnCount = viewDataMap[0].length;
    const {
      currentViewDataMap: result,
    } = viewDataMap.reduce(({ allDayPanelsCount, currentViewDataMap }, row, rowIndex) => {
      const isAllDay = row[0].allDay;

      const keyBase = (rowIndex - allDayPanelsCount) * totalColumnCount;

      const currentAllDayPanelsCount = isAllDay
        ? allDayPanelsCount + 1
        : allDayPanelsCount;

      currentViewDataMap[rowIndex].forEach((cell, columnIndex) => {
        cell.key = keyBase + columnIndex;
      });

      return { allDayPanelsCount: currentAllDayPanelsCount, currentViewDataMap };
    }, {
      allDayPanelsCount: 0,
      currentViewDataMap: viewDataMap,
    });

    return result;
  }

  generateViewDataMap(completeViewDataMap, options) {
    const {
      rowCount,
      startCellIndex,
      startRowIndex,
      cellCount,
      isVerticalGrouping,
      isAllDayPanelVisible,
    } = options;

    const sliceCells = (row, rowIndex, startIndex, count) => {
      const sliceToIndex = count !== undefined
        ? startIndex + count
        : undefined;

      return row
        .slice(startIndex, sliceToIndex)
        .map((cellData, columnIndex) => (
          {
            cellData,
            position: {
              rowIndex,
              columnIndex,
            },
          }));
    };

    let correctedStartRowIndex = startRowIndex;
    let allDayPanelMap = [];
    if (this._isStandaloneAllDayPanel(isVerticalGrouping, isAllDayPanelVisible)) {
      correctedStartRowIndex++;
      allDayPanelMap = sliceCells(completeViewDataMap[0], 0, startCellIndex, cellCount);
    }

    const displayedRowCount = getDisplayedRowCount(rowCount, completeViewDataMap);

    const dateTableMap = completeViewDataMap
      .slice(correctedStartRowIndex, correctedStartRowIndex + displayedRowCount)
      .map((row, rowIndex) => sliceCells(row, rowIndex, startCellIndex, cellCount));

    return {
      allDayPanelMap,
      dateTableMap,
    };
  }

  _isStandaloneAllDayPanel(isVerticalGrouping, isAllDayPanelVisible) {
    return !isVerticalGrouping && isAllDayPanelVisible;
  }

  getViewDataFromMap(completeViewDataMap, viewDataMap, options) {
    const {
      topVirtualRowHeight,
      bottomVirtualRowHeight,
      leftVirtualCellWidth,
      rightVirtualCellWidth,
      cellCount,
      rowCount,
      startRowIndex,
      startCellIndex,
      isProvideVirtualCellsWidth,
      isGroupedAllDayPanel,
      isVerticalGrouping,
      isAllDayPanelVisible,
    } = options;
    const {
      allDayPanelMap,
      dateTableMap,
    } = viewDataMap;

    const {
      groupedData,
    } = dateTableMap.reduce(({ previousGroupIndex, groupedData }, cellsRow) => {
      const cellDataRow = cellsRow.map(({ cellData }) => cellData);

      const firstCell = cellDataRow[0];
      const isAllDayRow = firstCell.allDay;
      const currentGroupIndex = firstCell.groupIndex;

      if (currentGroupIndex !== previousGroupIndex) {
        groupedData.push({
          dateTable: [],
          isGroupedAllDayPanel: getIsGroupedAllDayPanel(!!isAllDayRow, isVerticalGrouping),
          groupIndex: currentGroupIndex,
          key: getKeyByGroup(currentGroupIndex, isVerticalGrouping),
        });
      }

      if (isAllDayRow) {
        groupedData[groupedData.length - 1].allDayPanel = cellDataRow;
      } else {
        groupedData[groupedData.length - 1].dateTable.push({
          cells: cellDataRow,
          key: cellDataRow[0].key - startCellIndex,
        });
      }

      return {
        groupedData,
        previousGroupIndex: currentGroupIndex,
      };
    }, { previousGroupIndex: -1, groupedData: [] });

    if (this._isStandaloneAllDayPanel(isVerticalGrouping, isAllDayPanelVisible)) {
      groupedData[0].allDayPanel = allDayPanelMap.map(({ cellData }) => cellData);
    }

    const totalCellCount = getTotalCellCountByCompleteData(completeViewDataMap);
    const totalRowCount = getTotalRowCountByCompleteData(completeViewDataMap);
    const displayedCellCount = getDisplayedCellCount(cellCount, completeViewDataMap);
    const displayedRowCount = getDisplayedRowCount(rowCount, completeViewDataMap);

    return {
      groupedData,
      topVirtualRowHeight,
      bottomVirtualRowHeight,
      leftVirtualCellWidth: isProvideVirtualCellsWidth ? leftVirtualCellWidth : undefined,
      rightVirtualCellWidth: isProvideVirtualCellsWidth ? rightVirtualCellWidth : undefined,
      isGroupedAllDayPanel,
      leftVirtualCellCount: startCellIndex,
      rightVirtualCellCount: cellCount === undefined ? 0 : totalCellCount - startCellIndex - displayedCellCount,
      topVirtualRowCount: startRowIndex,
      bottomVirtualRowCount: totalRowCount - startRowIndex - displayedRowCount,
    };
  }

  _generateViewCellsData(options, rowCount, cellCountInGroupRow) {
    const viewCellsData: any[] = [];

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      viewCellsData.push(this._generateCellsRow(options, false, rowIndex, rowCount, cellCountInGroupRow));
    }

    return viewCellsData;
  }

  _generateAllDayPanelData(options, rowCount, columnCount) {
    if (!options.isAllDayPanelVisible) {
      return null;
    }

    return this._generateCellsRow(options, true, 0, rowCount, columnCount);
  }

  _generateCellsRow(options, allDay, rowIndex, rowCount, columnCount) {
    const cellsRow: any[] = [];

    for (let columnIndex = 0; columnIndex < columnCount; ++columnIndex) {
      const cellDataValue: any = this.getCellData(rowIndex, columnIndex, options, allDay);

      cellDataValue.index = rowIndex * columnCount + columnIndex;

      cellDataValue.isFirstGroupCell = this._isFirstGroupCell(rowIndex, columnIndex, options, rowCount, columnCount);
      cellDataValue.isLastGroupCell = this._isLastGroupCell(rowIndex, columnIndex, options, rowCount, columnCount);

      cellsRow.push(cellDataValue);
    }

    return cellsRow;
  }

  getCellData(rowIndex, columnIndex, options, allDay) {
    return allDay
      ? this.prepareAllDayCellData(options, rowIndex, columnIndex)
      : this.prepareCellData(options, rowIndex, columnIndex);
  }

  prepareCellData(options, rowIndex, columnIndex) {
    const {
      groups,
      startDayHour,
      endDayHour,
      hoursInterval,
    } = options;

    const groupsList = getAllGroups(groups);

    const startDate = this.getDateByCellIndices(
      options,
      rowIndex,
      columnIndex,
      this.getCellCountInDay(startDayHour, endDayHour, hoursInterval),
    );
    const endDate = this.getCellEndDate(startDate, options);

    const data: any = {
      startDate,
      endDate,
      allDay: this.tableAllDay,
      groupIndex: 0,
    };

    if (groupsList.length > 0) {
      // eslint-disable-next-line prefer-destructuring
      data.groups = groupsList[0];
    }

    return data;
  }

  prepareAllDayCellData(options: any, rowIndex: number, columnIndex: number): any {
    const data = this.prepareCellData({
      ...options,
      // NOTE: For all-day cells we should shift cell's dates
      // after trimming these dates time.
      viewOffset: 0,
    }, rowIndex, columnIndex);
    const { viewOffset } = options;
    const startDate = dateUtils.trimTime(data.startDate);
    const shiftedStartDate = dateUtilsTs.addOffsets(startDate, [viewOffset]);

    return {
      ...data,
      startDate: shiftedStartDate,
      endDate: shiftedStartDate,
      allDay: true,
    };
  }

  getDateByCellIndices(
    options: any,
    rowIndex: number,
    columnIndex: number,
    cellCountInDay: number,
  ): Date {
    let { startViewDate } = options;
    const {
      startDayHour,
      interval,
      firstDayOfWeek,
      intervalCount,
      viewOffset,
    } = options;

    const isStartViewDateDuringDST = startViewDate.getHours() !== Math.floor(startDayHour);

    if (isStartViewDateDuringDST) {
      const dateWithCorrectHours = getStartViewDateWithoutDST(startViewDate, startDayHour);
      startViewDate = new Date(dateWithCorrectHours.getTime() - toMs('day'));
    }

    const columnCountBase = this.getCellCount(options);
    const rowCountBase = this.getRowCount(options);
    const cellIndex = this._calculateCellIndex(rowIndex, columnIndex, rowCountBase, columnCountBase);
    const millisecondsOffset = this.getMillisecondsOffset(cellIndex, interval, cellCountInDay);

    const offsetByCount = this.isWorkView
      ? this.getTimeOffsetByColumnIndex(
        columnIndex,
        this.getFirstDayOfWeek(firstDayOfWeek),
        columnCountBase,
        intervalCount,
      ) : 0;

    const startViewDateTime = startViewDate.getTime();
    const currentDate = new Date(
      startViewDateTime + millisecondsOffset + offsetByCount + viewOffset,
    );

    const timeZoneDifference = isStartViewDateDuringDST
      ? 0
      : dateUtils.getTimezonesDifference(startViewDate, currentDate);

    currentDate.setTime(currentDate.getTime() + timeZoneDifference);

    return currentDate;
  }

  getMillisecondsOffset(cellIndex, interval, cellCountInDay) {
    const dayIndex = Math.floor(cellIndex / cellCountInDay);
    const realHiddenInterval = dayIndex * this.hiddenInterval;

    return interval * cellIndex + realHiddenInterval;
  }

  getTimeOffsetByColumnIndex(columnIndex, firstDayOfWeek, columnCount, intervalCount) {
    const firstDayOfWeekDiff = Math.max(0, firstDayOfWeek - 1);
    const columnsInWeek = columnCount / intervalCount;
    const weekendCount = Math.floor((columnIndex + firstDayOfWeekDiff) / columnsInWeek);

    return weekendCount * 2 * toMs('day');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calculateEndDate(startDate: Date, interval: number, endDayHour?: any): Date {
    return this.getCellEndDate(startDate, { interval });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _calculateCellIndex(rowIndex, columnIndex, rowCount, columnCountBase) {
    return (calculateCellIndex as any)(rowIndex, columnIndex, rowCount);
  }

  generateGroupedDataMap(viewDataMap) {
    const {
      allDayPanelMap,
      dateTableMap,
    } = viewDataMap;

    const { previousGroupedDataMap: dateTableGroupedMap } = dateTableMap.reduce((previousOptions, cellsRow) => {
      const {
        previousGroupedDataMap, previousRowIndex, previousGroupIndex,
      } = previousOptions;
      const { groupIndex: currentGroupIndex } = cellsRow[0].cellData;
      const currentRowIndex = currentGroupIndex === previousGroupIndex
        ? previousRowIndex + 1
        : 0;

      cellsRow.forEach((cell) => {
        const { groupIndex } = cell.cellData;

        if (!previousGroupedDataMap[groupIndex]) {
          previousGroupedDataMap[groupIndex] = [];
        }
        if (!previousGroupedDataMap[groupIndex][currentRowIndex]) {
          previousGroupedDataMap[groupIndex][currentRowIndex] = [];
        }

        previousGroupedDataMap[groupIndex][currentRowIndex].push(cell);
      });

      return {
        previousGroupedDataMap,
        previousRowIndex: currentRowIndex,
        previousGroupIndex: currentGroupIndex,
      };
    }, {
      previousGroupedDataMap: [],
      previousRowIndex: -1,
      previousGroupIndex: -1,
    });

    const allDayPanelGroupedMap: any = [];
    allDayPanelMap?.forEach((cell) => {
      const { groupIndex } = cell.cellData;

      if (!allDayPanelGroupedMap[groupIndex]) {
        allDayPanelGroupedMap[groupIndex] = [];
      }

      allDayPanelGroupedMap[groupIndex].push(cell);
    });

    return {
      allDayPanelGroupedMap,
      dateTableGroupedMap,
    };
  }

  _isFirstGroupCell(rowIndex, columnIndex, options, rowCount, columnCount) {
    const {
      groupOrientation,
      groups,
      isGroupedByDate,
    } = options;

    const groupCount = getGroupCount(groups);

    if (isGroupedByDate) {
      return columnIndex % groupCount === 0;
    }

    if (groupOrientation === HORIZONTAL_GROUP_ORIENTATION) {
      return columnIndex % columnCount === 0;
    }

    return rowIndex % rowCount === 0;
  }

  _isLastGroupCell(rowIndex, columnIndex, options, rowCount, columnCount) {
    const {
      groupOrientation,
      groups,
      isGroupedByDate,
    } = options;

    const groupCount = getGroupCount(groups);

    if (isGroupedByDate) {
      return (columnIndex + 1) % groupCount === 0;
    }

    if (groupOrientation === HORIZONTAL_GROUP_ORIENTATION) {
      return (columnIndex + 1) % columnCount === 0;
    }

    return (rowIndex + 1) % rowCount === 0;
  }

  markSelectedAndFocusedCells(viewDataMap, renderOptions) {
    const {
      selectedCells,
      focusedCell,
    } = renderOptions;

    if (!selectedCells && !focusedCell) {
      return viewDataMap;
    }

    const {
      allDayPanelMap,
      dateTableMap,
    } = viewDataMap;

    const nextDateTableMap = dateTableMap.map((row) => this._markSelectedAndFocusedCellsInRow(row, selectedCells, focusedCell));
    const nextAllDayMap = this._markSelectedAndFocusedCellsInRow(allDayPanelMap, selectedCells, focusedCell);

    return {
      allDayPanelMap: nextAllDayMap,
      dateTableMap: nextDateTableMap,
    };
  }

  _markSelectedAndFocusedCellsInRow(dataRow, selectedCells, focusedCell) {
    return dataRow.map((cell) => {
      const {
        index,
        groupIndex,
        allDay,
        startDate,
      } = cell.cellData;

      const indexInSelectedCells = selectedCells.findIndex(({
        index: selectedCellIndex,
        groupIndex: selectedCellGroupIndex,
        allDay: selectedCellAllDay,
        startDate: selectedCellStartDate,
      }) => groupIndex === selectedCellGroupIndex
                && (index === selectedCellIndex
                    || (selectedCellIndex === undefined
                        && startDate.getTime() === selectedCellStartDate.getTime()))
                && !!allDay === !!selectedCellAllDay);

      const isFocused = !!focusedCell
                && index === focusedCell.cellData.index
                && groupIndex === focusedCell.cellData.groupIndex
                && allDay === focusedCell.cellData.allDay;

      if (!isFocused && indexInSelectedCells === -1) {
        return cell;
      }

      return {
        ...cell,
        cellData: {
          ...cell.cellData,
          isSelected: indexInSelectedCells > -1,
          isFocused,
        },
      };
    });
  }

  getInterval(hoursInterval) {
    return hoursInterval * toMs('hour');
  }

  _getIntervalDuration(intervalCount) {
    return toMs('day') * intervalCount;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _setVisibilityDates(options: any) {}

  getCellCountInDay(startDayHour, endDayHour, hoursInterval) {
    const result = calculateDayDuration(startDayHour, endDayHour) / hoursInterval;

    return Math.ceil(result);
  }

  getCellCount(options) {
    const {
      intervalCount,
      viewType,
      startDayHour,
      endDayHour,
      hoursInterval,
    } = options;

    const cellCountInDay = this.getCellCountInDay(startDayHour, endDayHour, hoursInterval);
    const columnCountInDay = isHorizontalView(viewType)
      ? cellCountInDay
      : 1;

    return this.daysInInterval * intervalCount * columnCountInDay;
  }

  getRowCount(options) {
    const {
      viewType,
      startDayHour,
      endDayHour,
      hoursInterval,
    } = options;

    const cellCountInDay = this.getCellCountInDay(startDayHour, endDayHour, hoursInterval);
    const rowCountInDay = !isHorizontalView(viewType)
      ? cellCountInDay
      : 1;

    return rowCountInDay;
  }

  setHiddenInterval(startDayHour, endDayHour, hoursInterval) {
    this.hiddenInterval = toMs('day') - this.getVisibleDayDuration(startDayHour, endDayHour, hoursInterval);
  }

  getVisibleDayDuration(startDayHour, endDayHour, hoursInterval) {
    const cellCountInDay = this.getCellCountInDay(startDayHour, endDayHour, hoursInterval);

    return hoursInterval * cellCountInDay * toMs('hour');
  }

  getFirstDayOfWeek(firstDayOfWeekOption) {
    return firstDayOfWeekOption;
  }

  protected getCellEndDate(cellStartDate: Date, options: any): Date {
    const durationMs = Math.round(options.interval);
    return timezoneUtils.addOffsetsWithoutDST(cellStartDate, durationMs);
  }
}
