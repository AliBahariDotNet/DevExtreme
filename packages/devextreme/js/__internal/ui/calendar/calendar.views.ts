/* eslint-disable max-classes-per-file */
import dateLocalization from '@js/common/core/localization/date';
import domAdapter from '@js/core/dom_adapter';
import type { dxElementWrapper } from '@js/core/renderer';
import $ from '@js/core/renderer';
import dateSerialization from '@js/core/utils/date_serialization';
import type {
  CalendarSelectionMode, FirstDayOfWeek, WeekNumberRule,
} from '@js/ui/calendar';
import { isDefined } from '@js/core/utils/type';

import type { BaseViewProperties } from './calendar.base_view';
import BaseView from './calendar.base_view';

const CALENDAR_OTHER_MONTH_CLASS = 'dx-calendar-other-month';
const CALENDAR_OTHER_VIEW_CLASS = 'dx-calendar-other-view';
const CALENDAR_WEEK_NUMBER_CELL_CLASS = 'dx-calendar-week-number-cell';
const CALENDAR_WEEK_SELECTION_CLASS = 'dx-calendar-week-selection';

export interface MonthViewProperties extends BaseViewProperties {
  showWeekNumbers: boolean;

  firstDayOfWeek?: FirstDayOfWeek;

  weekNumberRule?: WeekNumberRule;

  selectionMode?: CalendarSelectionMode;

  selectWeekOnClick?: boolean;
}

export class MonthView extends BaseView<MonthViewProperties> {
  _getViewName(): string {
    return 'month';
  }

  _getCurrentDateFormat(): string {
    return 'longdate';
  }

  _getDefaultOptions(): MonthViewProperties {
    return {
      ...super._getDefaultOptions(),
      firstDayOfWeek: 0,
      rowCount: 6,
      colCount: 7,
    };
  }

  _renderImpl(): void {
    super._renderImpl();
    this._renderHeader();
  }

  _renderBody(): void {
    super._renderBody();

    this._$table.find(`.${CALENDAR_OTHER_VIEW_CLASS}`).addClass(CALENDAR_OTHER_MONTH_CLASS);
  }

  _renderFocusTarget(): void {}

  _renderHeader(): void {
    const $headerRow = $('<tr>');
    const $header = $('<thead>').append($headerRow);

    this._$table.prepend($header);

    const { colCount: columnsCount, showWeekNumbers } = this.option();

    for (let colIndex = 0, colCount = columnsCount; colIndex < colCount; colIndex += 1) {
      this._renderHeaderCell(colIndex, $headerRow);
    }

    if (showWeekNumbers) {
      this._renderWeekHeaderCell($headerRow);
    }
  }

  _renderHeaderCell(cellIndex: number, $headerRow: dxElementWrapper): void {
    const { firstDayOfWeek = 0 } = this.option();

    const {
      full: fullCaption,
      abbreviated: abbrCaption,
    } = this._getDayCaption(firstDayOfWeek + cellIndex);
    const $cell = $('<th>')
      // @ts-expect-error ts-error
      .attr({
        scope: 'col',
        abbr: fullCaption,
      })
      .text(abbrCaption);

    $headerRow.append($cell);
  }

  _renderWeekHeaderCell($headerRow: dxElementWrapper): void {
    const $weekNumberHeaderCell = $('<th>')
      // @ts-expect-error ts-error
      .attr({
        scope: 'col',
        abbr: 'WeekNumber',
        class: 'dx-week-number-header',
      });

    $headerRow.prepend($weekNumberHeaderCell);
  }

  _renderWeekNumberCell(rowData: { cellDate: Date; prevCellDate: Date; row: HTMLElement }): void {
    const {
      showWeekNumbers,
      cellTemplate,
      selectionMode,
      selectWeekOnClick,
    } = this.option();

    if (!showWeekNumbers) {
      return;
    }

    const weekNumber = this._getWeekNumber(rowData.prevCellDate);

    const cell = domAdapter.createElement('td');
    const $cell = $(cell);

    cell.className = CALENDAR_WEEK_NUMBER_CELL_CLASS;

    if (selectionMode !== 'single' && selectWeekOnClick) {
      $cell.addClass(CALENDAR_WEEK_SELECTION_CLASS);
    }

    if (cellTemplate) {
      // @ts-expect-error ts-error
      cellTemplate.render(this._prepareCellTemplateData(weekNumber, -1, $cell));
    } else {
      cell.innerHTML = `${weekNumber}`;
    }

    rowData.row.prepend(cell);

    this.setAria({
      role: 'gridcell',
      label: `Week ${weekNumber}`,
    }, $cell);
  }

  _getWeekNumber(date: Date): number {
    const { weekNumberRule = 'auto', firstDayOfWeek } = this.option();

    if (weekNumberRule === 'auto') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.dateUtils.getWeekNumber(
        date,
        firstDayOfWeek,
        firstDayOfWeek === 1 ? 'firstFourDays' : 'firstDay',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.getWeekNumber(date, firstDayOfWeek, weekNumberRule);
  }

  getNavigatorCaption(): string {
    const { date } = this.option();

    return `${this.dateLocalization.format(date, 'monthandyear')}`;
  }

  _isTodayCell(cellDate: Date): boolean {
    const { _todayDate: today } = this.option();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameDate(cellDate, today());
  }

  _isDateOutOfRange(cellDate: Date): boolean {
    const minDate = this.option('min');
    const maxDate = this.option('max');

    return !this.dateUtils.dateInRange(cellDate, minDate, maxDate, 'date');
  }

  _isOtherView(cellDate: Date): boolean {
    const { date } = this.option();

    return !this.dateUtils.sameMonthAndYear(cellDate, date);
  }

  _isStartDayOfMonth(cellDate: Date): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameDate(cellDate, this.dateUtils.getFirstMonthDate(this.option('date')));
  }

  _isEndDayOfMonth(cellDate: Date): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameDate(cellDate, this.dateUtils.getLastMonthDate(this.option('date')));
  }

  _getCellText(cellDate: Date): string {
    return `${this.dateLocalization.format(cellDate, 'd')}`;
  }

  _getDayCaption(day: number): { full: string; abbreviated: string } {
    const { colCount: daysInWeek } = this.option();
    const dayIndex = day % daysInWeek;

    return {
      full: this.dateLocalization.getDayNames()[dayIndex],
      abbreviated: this.dateLocalization.getDayNames('abbreviated')[dayIndex],
    };
  }

  _getFirstCellData(): Date {
    const { firstDayOfWeek = 0, date } = this.option();
    const firstDay = this.dateUtils.getFirstMonthDate(date) as Date;
    let firstMonthDayOffset = firstDayOfWeek - firstDay.getDay();
    const { colCount: daysInWeek } = this.option();

    if (firstMonthDayOffset > 0) {
      firstMonthDayOffset -= daysInWeek;
    }

    firstDay.setDate(firstDay.getDate() + firstMonthDayOffset);
    return firstDay;
  }

  _getNextCellData(date: Date): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);

    return newDate;
  }

  _getCellByDate(date: Date): dxElementWrapper {
    return this._$table.find(`td[data-value='${dateSerialization.serializeDate(date, this.dateUtils.getShortDateFormat())}']`);
  }

  isBoundary(date: Date): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameMonthAndYear(date, this.option('min')) || this.dateUtils.sameMonthAndYear(date, this.option('max'));
  }

  _getDefaultDisabledDatesHandler(
    disabledDates: Date[],
  ): (args: { date: Date }) => boolean {
    const dateUtils = this.dateUtils;
    return (args) => disabledDates.some((item) => dateUtils.sameDate(item, args.date));
  }
}

export class YearView extends BaseView {
  _getViewName(): string {
    return 'year';
  }

  _getCurrentDateFormat(): string {
    return 'monthandyear';
  }

  _isTodayCell(cellDate: Date): boolean {
    const { _todayDate: today } = this.option();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameMonthAndYear(cellDate, today());
  }

  _isDateOutOfRange(cellDate: Date): boolean {
    return !this.dateUtils.dateInRange(cellDate, this.dateUtils.getFirstMonthDate(this.option('min')), this.dateUtils.getLastMonthDate(this.option('max')));
  }

  _isOtherView(): boolean {
    return false;
  }

  _isStartDayOfMonth(): boolean {
    return false;
  }

  _isEndDayOfMonth(): boolean {
    return false;
  }

  _getCellText(cellDate: Date): string {
    return this.dateLocalization.getMonthNames('abbreviated')[this.dateUtils.getMonth(cellDate)];
  }

  _getFirstCellData(): Date {
    return this.dateUtils.getFirstMonthDateInYear(this.option('date'));
  }

  _getNextCellData(date: Date): Date {
    return this.dateUtils.getNextMonthDate(date);
  }

  _getCellByDate(date: Date): dxElementWrapper {
    const foundDate = this.dateUtils.getFirstMonthDate(date);
    return this._$table.find(`td[data-value='${dateSerialization.serializeDate(foundDate, this.dateUtils.getShortDateFormat())}']`);
  }

  getNavigatorCaption(): string {
    const { date } = this.option();

    return `${this.dateLocalization.format(date, 'yyyy')}`;
  }

  isBoundary(date: Date): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameYear(date, this.option('min')) || this.dateUtils.sameYear(date, this.option('max'));
  }

  _renderWeekNumberCell(): void {}
}

export class DecadeView extends BaseView {
  _getViewName(): string {
    return 'decade';
  }

  _isTodayCell(cellDate: Date): boolean {
    const { _todayDate: today } = this.option();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameYear(cellDate, today());
  }

  _isDateOutOfRange(cellDate: Date): boolean {
    return !this.dateUtils.dateInRange(cellDate, this.dateUtils.getFirstMonthDateInYear(this.option('min')), this.dateUtils.getLastMonthDateInYear(this.option('max')));
  }

  _isOtherView(cellDate: Date): boolean {
    return !this.dateUtils.sameDecade(cellDate, this.option('date'));
  }

  _isStartDayOfMonth(): boolean {
    return false;
  }

  _isEndDayOfMonth(): boolean {
    return false;
  }

  _getCellText(cellDate: Date): string {
    return `${this.dateLocalization.format(cellDate, 'yyyy')}`;
  }

  _getFirstCellData(): Date {
    const year = this.dateUtils.getFirstYearInDecade(this.option('date')) - 1;
    return this.dateUtils.createDateWithFullYear(year, 0, 1);
  }

  _getNextCellData(date: Date): Date {
    return this.dateUtils.getNextYearDate(date);
  }

  getNavigatorCaption(): string {
    const { date: currentDate } = this.option();
    const firstYearInDecade = this.dateUtils.getFirstYearInDecade(currentDate);
    const startDate = this.dateUtils.createDateWithFullYear(firstYearInDecade, 0, 1);
    const endDate = this.dateUtils.createDateWithFullYear(firstYearInDecade + 9, 0, 1);

    return `${this.dateLocalization.format(startDate, 'yyyy')}-${this.dateLocalization.format(endDate, 'yyyy')}`;
  }

  _isValueOnCurrentView(currentDate: Date, value: Date): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameDecade(currentDate, value);
  }

  _getCellByDate(date: Date): dxElementWrapper {
    const foundDate = this.dateUtils.getFirstMonthDateInYear(date);

    return this._$table.find(`td[data-value='${dateSerialization.serializeDate(foundDate, this.dateUtils.getShortDateFormat())}']`);
  }

  isBoundary(date: Date): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameDecade(date, this.option('min')) || this.dateUtils.sameDecade(date, this.option('max'));
  }

  _renderWeekNumberCell(): void {}
}

export class CenturyView extends BaseView {
  _getViewName(): string {
    return 'century';
  }

  _isTodayCell(cellDate: Date): boolean {
    const { _todayDate: today } = this.option();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameDecade(cellDate, today());
  }

  _isDateOutOfRange(cellDate: Date): boolean {
    const decade = this.dateUtils.getFirstYearInDecade(cellDate);
    const minDecade = this.dateUtils.getFirstYearInDecade(this.option('min'));
    const maxDecade = this.dateUtils.getFirstYearInDecade(this.option('max'));

    return !this.dateUtils.dateInRange(decade, minDecade, maxDecade);
  }

  _isOtherView(cellDate: Date): boolean {
    return !this.dateUtils.sameCentury(cellDate, this.option('date'));
  }

  _isStartDayOfMonth(): boolean {
    return false;
  }

  _isEndDayOfMonth(): boolean {
    return false;
  }

  _getCellText(cellDate: Date): string {
    const startDate = this.dateLocalization.format(cellDate, 'yyyy');
    const endDate = this.dateUtils.createDateWithFullYear(this.dateUtils.getYear(cellDate) + 9, 0, 1);

    return `${startDate} - ${this.dateLocalization.format(endDate, 'yyyy')}`;
  }

  _getFirstCellData(): Date {
    const decade = this.dateUtils.getFirstDecadeInCentury(this.option('date')) - 10;
    return this.dateUtils.createDateWithFullYear(decade, 0, 1);
  }

  _getNextCellData(date: Date): Date {
    return this.dateUtils.getNextDecadeDate(date);
  }

  _getCellByDate(date: Date): dxElementWrapper {
    let foundDate;
    if (isDefined(date)) {
      const year = this.dateUtils.getFirstYearInDecade(date);
      foundDate = this.dateUtils.createDateWithFullYear(year, 0, 1);
    }

    return this._$table.find(`td[data-value='${dateSerialization.serializeDate(foundDate, this.dateUtils.getShortDateFormat())}']`);
  }

  getNavigatorCaption(): string {
    const { date: currentDate } = this.option();
    const firstDecadeInCentury = this.dateUtils.getFirstDecadeInCentury(currentDate);
    const startDate = this.dateUtils.createDateWithFullYear(firstDecadeInCentury, 0, 1);
    const endDate = this.dateUtils.createDateWithFullYear(firstDecadeInCentury + 99, 0, 1);

    return `${this.dateLocalization.format(startDate, 'yyyy')}-${this.dateLocalization.format(endDate, 'yyyy')}`;
  }

  isBoundary(date: Date): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.dateUtils.sameCentury(date, this.option('min')) || this.dateUtils.sameCentury(date, this.option('max'));
  }

  _renderWeekNumberCell(): void {}
}

export default {
  month: MonthView,
  year: YearView,
  decade: DecadeView,
  century: CenturyView,
};
