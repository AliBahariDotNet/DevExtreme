import domAdapter from '@js/core/dom_adapter';
import $ from '@js/core/renderer';
import { noop } from '@js/core/utils/common';
import dateSerialization from '@js/core/utils/date_serialization';
import { extend } from '@js/core/utils/extend';
import { isDefined } from '@js/core/utils/type';

import BaseView from './m_calendar.base_view';

const CALENDAR_OTHER_MONTH_CLASS = 'dx-calendar-other-month';
const CALENDAR_OTHER_VIEW_CLASS = 'dx-calendar-other-view';
const CALENDAR_WEEK_NUMBER_CELL_CLASS = 'dx-calendar-week-number-cell';
const CALENDAR_WEEK_SELECTION_CLASS = 'dx-calendar-week-selection';

const Views = {

  month: BaseView.inherit({

    _getViewName() {
      return 'month';
    },

    _getCurrentDateFormat() {
      return 'longdate';
    },

    _getDefaultOptions() {
      return extend(this.callBase(), {
        firstDayOfWeek: 0,
        rowCount: 6,
        colCount: 7,
      });
    },

    _renderImpl() {
      this.callBase();
      this._renderHeader();
    },

    _renderBody() {
      this.callBase();

      this._$table.find(`.${CALENDAR_OTHER_VIEW_CLASS}`).addClass(CALENDAR_OTHER_MONTH_CLASS);
    },

    _renderFocusTarget: noop,

    _renderHeader() {
      const $headerRow = $('<tr>');
      const $header = $('<thead>').append($headerRow);

      this._$table.prepend($header);

      for (let colIndex = 0, colCount = this.option('colCount'); colIndex < colCount; colIndex++) {
        this._renderHeaderCell(colIndex, $headerRow);
      }

      if (this.option('showWeekNumbers')) {
        this._renderWeekHeaderCell($headerRow);
      }
    },

    _renderHeaderCell(cellIndex, $headerRow) {
      const { firstDayOfWeek } = this.option();

      const {
        full: fullCaption,
        abbreviated: abbrCaption,
      } = this._getDayCaption(firstDayOfWeek + cellIndex);
      const $cell = $('<th>')
        // @ts-expect-error
        .attr({
          scope: 'col',
          abbr: fullCaption,
        })
        .text(abbrCaption);

      $headerRow.append($cell);
    },

    _renderWeekHeaderCell($headerRow) {
      const $weekNumberHeaderCell = $('<th>')
        // @ts-expect-error
        .attr({
          scope: 'col',
          abbr: 'WeekNumber',
          class: 'dx-week-number-header',
        });

      $headerRow.prepend($weekNumberHeaderCell);
    },

    _renderWeekNumberCell(rowData) {
      const {
        showWeekNumbers, cellTemplate, selectionMode, selectWeekOnClick,
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
        cellTemplate.render(this._prepareCellTemplateData(weekNumber, -1, $cell));
      } else {
        cell.innerHTML = weekNumber;
      }

      rowData.row.prepend(cell);

      this.setAria({
        role: 'gridcell',
        label: `Week ${weekNumber}`,
      }, $cell);
    },

    _getWeekNumber(date) {
      const { weekNumberRule, firstDayOfWeek } = this.option();

      if (weekNumberRule === 'auto') {
        return this.dateUtils.getWeekNumber(date, firstDayOfWeek, firstDayOfWeek === 1 ? 'firstFourDays' : 'firstDay');
      }

      return this.dateUtils.getWeekNumber(date, firstDayOfWeek, weekNumberRule);
    },

    getNavigatorCaption() {
      return this.dateLocalization.format(this.option('date'), 'monthandyear');
    },

    _isTodayCell(cellDate) {
      const today = this.option('_todayDate')();

      return this.dateUtils.sameDate(cellDate, today);
    },

    _isDateOutOfRange(cellDate) {
      const minDate = this.option('min');
      const maxDate = this.option('max');

      return !this.dateUtils.dateInRange(cellDate, minDate, maxDate, 'date');
    },

    _isOtherView(cellDate) {
      return !this.dateUtils.sameMonthAndYear(cellDate, this.option('date'));
    },

    _isStartDayOfMonth(cellDate) {
      return this.dateUtils.sameDate(cellDate, this.dateUtils.getFirstMonthDate(this.option('date')));
    },

    _isEndDayOfMonth(cellDate) {
      return this.dateUtils.sameDate(cellDate, this.dateUtils.getLastMonthDate(this.option('date')));
    },

    _getCellText(cellDate) {
      return this.dateLocalization.format(cellDate, 'd');
    },

    _getDayCaption(day) {
      const daysInWeek = this.option('colCount');
      const dayIndex = day % daysInWeek;

      return {
        full: this.dateLocalization.getDayNames()[dayIndex],
        abbreviated: this.dateLocalization.getDayNames('abbreviated')[dayIndex],
      };
    },

    _getFirstCellData() {
      const firstDay = this.dateUtils.getFirstMonthDate(this.option('date'));

      let firstMonthDayOffset = this._getFirstDayOfWeek() - firstDay.getDay();
      const daysInWeek = this.option('colCount');

      if (firstMonthDayOffset > 0) {
        firstMonthDayOffset -= daysInWeek;
      }

      firstDay.setDate(firstDay.getDate() + firstMonthDayOffset);
      return firstDay;
    },

    _getNextCellData(date) {
      date = new Date(date);
      date.setDate(date.getDate() + 1);
      return date;
    },

    _getFirstDayOfWeek() {
        return isDefined(this.option('firstDayOfWeek')) ? this.option('firstDayOfWeek') : this.dateLocalization.firstDayOfWeekIndex();
    },

    _getCellByDate(date) {
      return this._$table.find(`td[data-value='${dateSerialization.serializeDate(date, this.dateUtils.getShortDateFormat())}']`);
    },

    isBoundary(date) {
      return this.dateUtils.sameMonthAndYear(date, this.option('min')) || this.dateUtils.sameMonthAndYear(date, this.option('max'));
    },

    _getDefaultDisabledDatesHandler(disabledDates) {
      const dateUtils = this.dateUtils;
      // @ts-expect-error
      return function (args) {
        const isDisabledDate = disabledDates.some((item) => dateUtils.sameDate(item, args.date));

        if (isDisabledDate) {
          return true;
        }
      };
    },
  }),

  year: BaseView.inherit({

    _getViewName() {
      return 'year';
    },

    _getCurrentDateFormat() {
      return 'monthandyear';
    },

    _isTodayCell(cellDate) {
      const today = this.option('_todayDate')();

      return this.dateUtils.sameMonthAndYear(cellDate, today);
    },

    _isDateOutOfRange(cellDate) {
      return !this.dateUtils.dateInRange(cellDate, this.dateUtils.getFirstMonthDate(this.option('min')), this.dateUtils.getLastMonthDate(this.option('max')));
    },

    _isOtherView() {
      return false;
    },

    _isStartDayOfMonth() {
      return false;
    },

    _isEndDayOfMonth() {
      return false;
    },

    _getCellText(cellDate) {
      return this.dateLocalization.getMonthNames('abbreviated')[this.dateUtils.getMonth(cellDate)];
    },

    _getFirstCellData() {
      return this.dateUtils.getFirstMonthDateInYear(this.option('date'));
    },

    _getNextCellData(date) {
      return this.dateUtils.getNextMonthDate(date);
    },

    _getCellByDate(date) {
      const foundDate = this.dateUtils.getFirstMonthDate(date);
      return this._$table.find(`td[data-value='${dateSerialization.serializeDate(foundDate, this.dateUtils.getShortDateFormat())}']`);
    },

    getNavigatorCaption() {
      return this.dateLocalization.format(this.option('date'), 'yyyy');
    },

    isBoundary(date) {
      return this.dateUtils.sameYear(date, this.option('min')) || this.dateUtils.sameYear(date, this.option('max'));
    },

    _renderWeekNumberCell: noop,
  }),

  decade: BaseView.inherit({

    _getViewName() {
      return 'decade';
    },

    _isTodayCell(cellDate) {
      const today = this.option('_todayDate')();

      return this.dateUtils.sameYear(cellDate, today);
    },

    _isDateOutOfRange(cellDate) {
      return !this.dateUtils.dateInRange(cellDate, this.dateUtils.getFirstMonthDateInYear(this.option('min')), this.dateUtils.getLastMonthDateInYear(this.option('max')));
    },

    _isOtherView(cellDate) {
      return !this.dateUtils.sameDecade(cellDate, this.option('date'));
    },

    _isStartDayOfMonth() {
      return false;
    },

    _isEndDayOfMonth() {
      return false;
    },

    _getCellText(cellDate) {
      return this.dateLocalization.format(cellDate, 'yyyy');
    },

    _getFirstCellData() {
      const year = this.dateUtils.getFirstYearInDecade(this.option('date')) - 1;
      return this.dateUtils.createDateWithFullYear(year, 0, 1);
    },

    _getNextCellData(date) {
      return this.dateUtils.getNextYearDate(date);
    },

    getNavigatorCaption() {
      const currentDate = this.option('date');
      const firstYearInDecade = this.dateUtils.getFirstYearInDecade(currentDate);
      const startDate = this.dateUtils.createDateWithFullYear(firstYearInDecade, 0, 1);
      const endDate = this.dateUtils.createDateWithFullYear(firstYearInDecade + 9, 0, 1);


      return `${this.dateLocalization.format(startDate, 'yyyy')}-${this.dateLocalization.format(endDate, 'yyyy')}`;
    },

    _isValueOnCurrentView(currentDate, value) {
      return this.dateUtils.sameDecade(currentDate, value);
    },

    _getCellByDate(date) {
      const foundDate = this.dateUtils.getFirstMonthDateInYear(date);

      return this._$table.find(`td[data-value='${dateSerialization.serializeDate(foundDate, this.dateUtils.getShortDateFormat())}']`);
    },

    isBoundary(date) {
      return this.dateUtils.sameDecade(date, this.option('min')) || this.dateUtils.sameDecade(date, this.option('max'));
    },

    _renderWeekNumberCell: noop,
  }),

  century: BaseView.inherit({

    _getViewName() {
      return 'century';
    },

    _isTodayCell(cellDate) {
      const today = this.option('_todayDate')();

      return this.dateUtils.sameDecade(cellDate, today);
    },

    _isDateOutOfRange(cellDate) {
      const decade = this.dateUtils.getFirstYearInDecade(cellDate);
      const minDecade = this.dateUtils.getFirstYearInDecade(this.option('min'));
      const maxDecade = this.dateUtils.getFirstYearInDecade(this.option('max'));

      return !this.dateUtils.dateInRange(decade, minDecade, maxDecade);
    },

    _isOtherView(cellDate) {
      return !this.dateUtils.sameCentury(cellDate, this.option('date'));
    },

    _isStartDayOfMonth() {
      return false;
    },

    _isEndDayOfMonth() {
      return false;
    },

    _getCellText(cellDate) {
      const startDate = this.dateLocalization.format(cellDate, 'yyyy');
      const endDate = this.dateUtils.createDateWithFullYear(this.dateUtils.getYear(cellDate) + 9, 0, 1);

      return `${startDate} - ${this.dateLocalization.format(endDate, 'yyyy')}`;
    },

    _getFirstCellData() {
      const decade = this.dateUtils.getFirstDecadeInCentury(this.option('date')) - 10;
      return this.dateUtils.createDateWithFullYear(decade, 0, 1);
    },

    _getNextCellData(date) {
      return this.dateUtils.getNextDecadeDate(date);
    },

    _getCellByDate(date) {
      let foundDate;
      if(isDefined(date)) {
          const year = this.dateUtils.getFirstYearInDecade(date);
          foundDate = this.dateUtils.createDateWithFullYear(year, 0, 1);
      }

      return this._$table.find(`td[data-value='${dateSerialization.serializeDate(foundDate, this.dateUtils.getShortDateFormat())}']`);
    },

    getNavigatorCaption() {
      const currentDate = this.option('date');
      const firstDecadeInCentury = this.dateUtils.getFirstDecadeInCentury(currentDate);
      const startDate = this.dateUtils.createDateWithFullYear(firstDecadeInCentury, 0, 1);
      const endDate = this.dateUtils.createDateWithFullYear(firstDecadeInCentury + 99, 0, 1);

      return `${this.dateLocalization.format(startDate, 'yyyy')}-${this.dateLocalization.format(endDate, 'yyyy')}`;
    },

    isBoundary(date) {
      return this.dateUtils.sameCentury(date, this.option('min')) || this.dateUtils.sameCentury(date, this.option('max'));
    },

    _renderWeekNumberCell: noop,
  }),
};

export default Views;
