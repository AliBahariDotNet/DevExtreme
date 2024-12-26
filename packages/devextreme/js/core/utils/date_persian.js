import moment from './jalali-moment/jalali-moment';
import dateUtils from '../../core/utils/date';
import uiDateUtils from '../../__internal/ui/date_box/m_date_utils';
import { getFormat as getLDMLDateFormat } from '../../localization/ldml/date.format';
import { getFormatter } from '../../localization/ldml/date.formatter';
import { getParser } from '../../localization/ldml/date.parser';
import { fitIntoRange } from './math';
import { isString } from './type';
import errors from '../errors';
import numberLocalization from '../../localization/number';

const toMilliseconds = dateUtils.dateToMilliseconds;

const DAYS_IN_WEEK = 7;
const THURSDAY_WEEK_NUMBER = 4;
const SATURDAY_WEEK_NUMBER = 6;
const USUAL_WEEK_COUNT_IN_YEAR = 52;

const FORMATS_TO_PATTERN_MAP = {
    'longdate': 'dddd, D MMMM YYYY',
    'longtime': 'h:mm:ss a',
    'longdatelongtime': 'dddd, D MMMM YYYY, h:mm:ss a',
    'monthandday': 'D MMMM',
    'monthandyear': 'MMMM YYYY',
    'quarterandyear': 'Qo YYYY',
    'shortdate': 'YYYY/M/D',
    'shorttime': 'h:mm a',
    'shortdateshorttime': 'YYYY/M/D h:mm a',
    'millisecond': 'SSS',
    'second': 'ss',
    'minute': 'mm',
    'hour': 'HH',
    'd': 'D',
    'day': 'D',
    'dayofweek': 'dddd',
    'month': 'MMMM',
    'quarter': 'Q',
    'year': 'yyyy',
    'datetime-local': 'yyyy-MM-DDTHH\':\'mm\':\'ss'
};

(function() {
    moment.locale('fa');
})();

const toPersian = date => moment(date);

function toDate(date) {
    return date.toDate();
}

const format = (date, format) => {
    if(!date) {
        return;
    }

    if(!format) {
        return date;
    }

    let formatter;

    if(typeof (format) === 'function') {
        formatter = format;
    } else if(format.formatter) {
        formatter = format.formatter;
    } else {
        format = format.type || format;
        if(isString(format)) {
            const pattern = FORMATS_TO_PATTERN_MAP[format.toLowerCase()];

            if(pattern) {
                return numberLocalization.convertDigits(toPersian(date).format(pattern));
            }

            const persianDate = toPersian(date);
            const newDate = new Date();
            {
                newDate['getFullYear'] = () => persianDate.year();
                newDate['getUTCFullYear'] = () => persianDate.utc().year();
                newDate['getMonth'] = () => persianDate.month();
                newDate['getUTCMonth'] = () => persianDate.utc().month();
                newDate['getDate'] = () => persianDate.date();
                newDate['getUTCDate'] = () => persianDate.utc().date();
                newDate['getDay'] = () => persianDate.day();
                newDate['getUTCDay'] = () => persianDate.utc().day();
                newDate['getHours'] = () => persianDate.hours();
                newDate['getUTCHours'] = () => persianDate.utc().hours();
                newDate['getMinutes'] = () => persianDate.minutes();
                newDate['getUTCMinutes'] = () => persianDate.utc().minutes();
                newDate['getSeconds'] = () => persianDate.seconds();
                newDate['getUTCSeconds'] = () => persianDate.utc().seconds();
                newDate['getMilliseconds'] = () => persianDate.milliseconds();
                newDate['getUTCMilliseconds'] = () => persianDate.utc().milliseconds();
                newDate['getTimezoneOffset'] = () => date.getTimezoneOffset();
            }

            return numberLocalization.convertDigits(getFormatter(format, persianDateUtils)(newDate));
        }
    }

    if(!formatter) {
        // TODO: log warning or error
        return;
    }

    return formatter(date);
};

const getDayNames = format => {
    switch(format) {
        case undefined:
        case null:
        case '':
        default:
            return moment.localeData().weekdays();

        case 'abbreviated':
            return moment.localeData().weekdaysMin();
    }
};

const getMonthNames = format => {
    switch(format) {
        case undefined:
        case null:
        case '':
        default:
            return moment.localeData().jMonths();

        case 'abbreviated':
            return moment.localeData().jMonthsShort();
    }
};

const firstDayOfWeekIndex = () => 6;

function getUTCTime(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDayNumber(date) {
    const ms = getUTCTime(date) - getUTCTime(getFirstMonthDateInYear(date));

    return 1 + Math.floor(ms / toMilliseconds('day'));
}

function getDayWeekNumber(date, firstDayOfWeek) {
    let day = date.getDay() - firstDayOfWeek + 1;
    if(day <= 0) { day += DAYS_IN_WEEK; }

    return day;
}

const getWeekNumber = (date, firstDayOfWeek, rule) => {
    const firstWeekDayInYear = getDayWeekNumber(getFirstMonthDateInYear(date), firstDayOfWeek);
    const lastWeekDayInYear = getDayWeekNumber(getLastMonthDateInYear(date), firstDayOfWeek);
    const daysInFirstWeek = DAYS_IN_WEEK - firstWeekDayInYear + 1;

    let weekNumber = Math.ceil((getDayNumber(date) - daysInFirstWeek) / 7);
    switch(rule) {
        case 'fullWeek': {
            if(daysInFirstWeek === DAYS_IN_WEEK) { weekNumber++; }
            if(weekNumber === 0) {
                const lastDateInPreviousYear = getLastMonthDateInYear(getPreviousYearDate(date));
                return getWeekNumber(lastDateInPreviousYear, firstDayOfWeek, rule);
            }
            return weekNumber;
        }
        case 'firstDay': {
            if(daysInFirstWeek > 0) { weekNumber++; }

            const isSaturday = firstWeekDayInYear === SATURDAY_WEEK_NUMBER
                || lastWeekDayInYear === SATURDAY_WEEK_NUMBER;
            if((weekNumber > USUAL_WEEK_COUNT_IN_YEAR && !isSaturday) || weekNumber === 54) { weekNumber = 1; }

            return weekNumber;
        }
        case 'firstFourDays': {
            if(daysInFirstWeek > 3) { weekNumber++; }

            const isThursday = firstWeekDayInYear === THURSDAY_WEEK_NUMBER
                || lastWeekDayInYear === THURSDAY_WEEK_NUMBER;
            if(weekNumber > USUAL_WEEK_COUNT_IN_YEAR && !isThursday) { weekNumber = 1; }

            if(weekNumber === 0) {
                const lastDateInPreviousYear = getLastMonthDateInYear(getPreviousYearDate(date));
                return getWeekNumber(lastDateInPreviousYear, firstDayOfWeek, rule);
            }
            return weekNumber;
        }
        default:
            break;
    }
};

const getDate = date => toPersian(date).date();

const getMonth = date => toPersian(date).month();

const getFirstMonthDate = date => date && toDate(toPersian(date).startOf('month'));

const getNextMonthDate = date => date && toDate(toPersian(date).add(1, 'month'));

const getLastMonthDate = date => date && toDate(toPersian(date).endOf('month'));

const getFirstMonthDateInYear = date => date && toDate(toPersian(date).startOf('year'));

const getLastMonthDateInYear = date => date && toDate(toPersian(date).endOf('year'));

const getYear = date => date && toPersian(date).year();

const getFirstYearInDecade = date => date && toPersian(date).year() - toPersian(date).year() % 10;

const getFirstDecadeInCentury = date => date && toPersian(date).year() - toPersian(date).year() % 100;

const getPreviousYearDate = date => date && toDate(toPersian(date).add(-1, 'year'));

const getNextYearDate = date => date && toDate(toPersian(date).add(1, 'year'));

const getNextDecadeDate = date => date && toDate(toPersian(date).add(10, 'year'));

const sameDate = (date1, date2) => date1 && date2 && toPersian(date1).isSame(toPersian(date2), 'day');

const sameMonthAndYear = (date1, date2) => date1 && date2 && toPersian(date1).isSame(toPersian(date2), 'month');

const sameYear = (date1, date2) => date1 && date2 && toPersian(date1).isSame(toPersian(date2), 'year');

const sameDecade = (date1, date2) => date1 && date2 && getFirstYearInDecade(date1) === getFirstYearInDecade(date2);

const sameCentury = (date1, date2) => date1 && date2 && getFirstDecadeInCentury(date1) === getFirstDecadeInCentury(date2);

const createDateWithFullYear = (year, month, date) => toDate(moment(year + '/' + (month + 1) + '/' + date, 'jYYYY/jM/jD'));

const dateInRange = (date, min, max, format) => dateUtils.dateInRange(date, min, max, format);

const getShortDateFormat = () => dateUtils.getShortDateFormat();

// Calendar Functions Begin

const ZOOM_LEVEL = {
    MONTH: 'month', YEAR: 'year', DECADE: 'decade', CENTURY: 'century'
};

const shiftDate = (zoomLevel, date, offset, reverse) => {
    let amount = offset * reverse;
    let unit;

    switch(zoomLevel) {
        case ZOOM_LEVEL.MONTH:
            unit = 'day';
            break;
        case ZOOM_LEVEL.YEAR:
            unit = 'month';
            break;
        case ZOOM_LEVEL.DECADE:
            unit = 'year';
            break;
        case ZOOM_LEVEL.CENTURY:
            amount = 10 * amount;
            unit = 'year';
            break;
    }

    setParamsToDate(date, toDate(toPersian(date).add(amount, unit)));
};

const areDatesInNeighborView = (zoomLevel, date1, date2) => {
    const monthMinDistance = (a, b) => {
        const abs = Math.abs(a - b);
        return Math.min(abs, 12 - abs);
    };

    date1 = toPersian(date1);
    date2 = toPersian(date2);

    switch(zoomLevel) {
        case ZOOM_LEVEL.MONTH:
            return monthMinDistance(date1.month(), date2.month()) <= 1;
        case ZOOM_LEVEL.YEAR:
            return Math.abs(date1.year() - date2.year()) <= 1;
        case ZOOM_LEVEL.DECADE:
            return Math.abs(date1.year() - date2.year()) <= 10;
        case ZOOM_LEVEL.CENTURY:
            return Math.abs(date1.year() - date2.year()) <= 100;
    }
};

const areDatesInSameView = (zoomLevel, date1, date2) => {
    date1 = toPersian(date1);
    date2 = toPersian(date2);

    switch(zoomLevel) {
        case ZOOM_LEVEL.MONTH:
            return date1.month() === date2.month();
        case ZOOM_LEVEL.YEAR:
            return date1.year() === date2.year();
        case ZOOM_LEVEL.DECADE:
            return parseInt(date1.year() / 10) === parseInt(date2.year() / 10);
        case ZOOM_LEVEL.CENTURY:
            return parseInt(date1.year() / 100) === parseInt(date2.year() / 100);
    }
};

const getDateByOffset = (offset, date, zoomLevel) => {
    date = toPersian(date);

    const currentDay = date.date();
    const difference = dateUtils.getDifferenceInMonth(zoomLevel) * offset;

    date.date(1);
    date.month(date.month() + difference);

    const lastDay = date.endOf('month').date();
    date.date(currentDay > lastDay ? lastDay : currentDay);

    return toDate(date);
};

const getMonthsOffset = (startDate, endDate) => {
    startDate = toPersian(startDate);
    endDate = toPersian(endDate);

    const yearOffset = endDate.year() - startDate.year();
    const monthOffset = endDate.month() - startDate.month();

    return yearOffset * 12 + monthOffset;
};

const getViewsOffset = (startDate, endDate, zoomCorrection) => {
    startDate = toPersian(startDate);
    endDate = toPersian(endDate);

    return parseInt(endDate.year() / zoomCorrection) - parseInt(startDate.year() / zoomCorrection);
};

const sameView = (view, date1, date2) => {
    switch(view) {
        case ZOOM_LEVEL.MONTH:
            return sameMonthAndYear(date1, date2);
        case ZOOM_LEVEL.YEAR:
            return sameYear(date1, date2);
        case ZOOM_LEVEL.DECADE:
            return sameDecade(date1, date2);
        case ZOOM_LEVEL.CENTURY:
            return sameCentury(date1, date2);
    }
};

const getViewFirstCellDate = function(viewType, date) {
    const originalDate = date;
    date = toPersian(date);

    switch(viewType) {
        case ZOOM_LEVEL.MONTH:
            return createDateWithFullYear(date.year(), date.month(), 1);
        case ZOOM_LEVEL.YEAR:
            return createDateWithFullYear(date.year(), 0, date.date());
        case ZOOM_LEVEL.DECADE:
            return createDateWithFullYear(getFirstYearInDecade(originalDate), date.month(), date.date());
        case ZOOM_LEVEL.CENTURY:
            return createDateWithFullYear(getFirstDecadeInCentury(originalDate), date.month(), date.date());
    }
};

const getViewLastCellDate = function(viewType, date) {
    const originalDate = date;
    date = toPersian(date);

    switch(viewType) {
        case ZOOM_LEVEL.MONTH:
            return getLastMonthDate(originalDate);
        case ZOOM_LEVEL.YEAR:
            return createDateWithFullYear(date.year(), 11, date.date());
        case ZOOM_LEVEL.DECADE:
            return createDateWithFullYear(getFirstYearInDecade(originalDate) + 9, date.month(), date.date());
        case ZOOM_LEVEL.CENTURY:
            return createDateWithFullYear(getFirstDecadeInCentury(originalDate) + 90, date.month(), date.date());
    }
};

const getViewMinBoundaryDate = function(viewType, date) {
    switch(viewType) {
        case ZOOM_LEVEL.MONTH:
            return getFirstMonthDate(date);
        case ZOOM_LEVEL.YEAR:
            return getFirstMonthDateInYear(date);
        case ZOOM_LEVEL.DECADE:
            return createDateWithFullYear(getFirstYearInDecade(date), 0, 1);
        case ZOOM_LEVEL.CENTURY:
            return createDateWithFullYear(getFirstDecadeInCentury(date), 0, 1);
    }
};

const getViewMaxBoundaryDate = function(viewType, date) {
    switch(viewType) {
        case ZOOM_LEVEL.MONTH:
            return getLastMonthDate(date);
        case ZOOM_LEVEL.YEAR:
            return getLastMonthDateInYear(date);
        case ZOOM_LEVEL.DECADE:
            return createDateWithFullYear(getFirstYearInDecade(date) + 9, 11, toPersian(date).endOf('month').date());
        case ZOOM_LEVEL.CENTURY:
            return createDateWithFullYear(getFirstDecadeInCentury(date) + 99, 11, toPersian(date).endOf('month').date());
    }
};

// Calendar Functions End

// Date Box Function Begin

const parse = (text, format) => {
    if(!text || text === '') {
        return;
    }

    if(!format) {
        return parse(text, 'shortdate');
    }

    if(format.parser) {
        return format.parser(text);
    }

    text = numberLocalization.convertDigits(text, true);

    let ldmlFormat;

    if(isString(format) && !FORMATS_TO_PATTERN_MAP[format.toLowerCase()]) {
        ldmlFormat = format;
    } else {
        const formatter = value => {
            return numberLocalization.convertDigits(persianDateUtils.format(value, format), true);
        };
        try {
            ldmlFormat = getLDMLDateFormat(formatter, persianDateUtils);
        } catch(e) {
        }
    }

    if(ldmlFormat) {
        const persianDate = toPersian(getFirstMonthDateInYear(new Date()));
        const newDate = toDate(persianDate);
        {
            newDate['setFullYear'] = (value) => persianDate.year(value);
            newDate['setMonth'] = (value) => persianDate.month(value);
            newDate['setDate'] = (value) => persianDate.date(value);
            newDate['setHours'] = (value) => persianDate.hours(value);
            newDate['setMinutes'] = (value) => persianDate.minutes(value);
            newDate['setSeconds'] = (value) => persianDate.seconds(value);
            newDate['setMilliseconds'] = (value) => persianDate.milliseconds(value);

            newDate['getFullYear'] = () => persianDate.year();
            newDate['getMonth'] = () => persianDate.month();
            newDate['getDate'] = () => persianDate.date();
            newDate['getHours'] = () => persianDate.hours();
            newDate['getMinutes'] = () => persianDate.minutes();
            newDate['getSeconds'] = () => persianDate.seconds();
            newDate['getMilliseconds'] = () => persianDate.milliseconds();
        }

        const tempParsedDate = getParser(ldmlFormat, persianDateUtils)(text, newDate);
        if(tempParsedDate) {
            return toDate(persianDate);
        }
    }

    errors.log('W0012');
    const result = new Date(text);

    if(!result || isNaN(result.getTime())) {
        return;
    }

    return result;
};

const getDatePatternsForFormat = () => {
    return [
        { date: new Date(2021, 4, 27, 6, 5, 4, 111), pattern: 'S' },
        { date: new Date(2021, 4, 27, 6, 5, 2), pattern: 's' },
        { date: new Date(2021, 4, 27, 6, 2, 4), pattern: 'm' },
        { date: new Date(2021, 4, 27, 18, 5, 4), pattern: 'H', isDigit: true },
        { date: new Date(2021, 4, 27, 2, 5, 4), pattern: 'h', isDigit: true },
        { date: new Date(2021, 4, 27, 18, 5, 4), pattern: 'a', isDigit: false },
        { date: new Date(2021, 5, 3, 6, 5, 4), pattern: 'd' },
        {
            date: [new Date(2021, 4, 31, 6, 5, 4), new Date(2021, 5, 1, 6, 5, 4), new Date(2021, 5, 2, 6, 5, 4)],
            pattern: 'E'
        },
        { date: new Date(2021, 9, 28, 6, 5, 4), pattern: 'M' },
        { date: new Date(1013, 4, 27, 6, 5, 4), pattern: 'y' }
    ];
};

const getDefaultDatePatternForFormat = () => new Date(2021, 4, 27, 6, 5, 4);

const getDatePartValue = (date, partPattern) => {
    date = toPersian(date);

    switch(partPattern.toString()[0]) {
        case 'a':
            return date.hour() < 12 ? 0 : 1;
        case 'E':
            return getPersianDay(date);
        case 'y':
            return date.year();
        case 'M':
        case 'L':
            return date.month() + 1;
        case 'd':
            return date.date();
        case 'H':
            return date.hour();
        case 'h':
            return date.hour();
        case 'm':
            return date.minute();
        case 's':
            return date.second();
        case 'S':
            return date.milliseconds();
    }
};

const setDatePartValue = (date, partPattern, value) => {
    const persianDate = toPersian(date);
    const intValue = () => parseInt(value.toString());

    switch(partPattern.toString()[0]) {
        case 'a': {
            const hours = date.getHours();
            const current = hours >= 12;

            if(current === !!(intValue())) return;

            persianDate.hour((hours + 12) % 24);
            break;
        }

        case 'E': {
            if(intValue() < 0) {
                return;
            }
            persianDate.date(persianDate.date() - getPersianDay(persianDate) + intValue());
            break;
        }

        case 'y': {
            const currentYear = persianDate.year();
            const valueLength = String(value).length;
            const maxLimitLength = String(getDatePartLimits('y', date).max).length;
            const newValue = parseInt(String(currentYear).substr(0, maxLimitLength - valueLength) + value);

            persianDate.year(newValue);
            break;
        }

        case 'M':
        case 'L': {
            const day = persianDate.date();
            const monthLimits = getDatePartLimits('M', date);
            const newValue = fitIntoRange(intValue(), monthLimits.min, monthLimits.max);

            persianDate.date(1);
            persianDate.month(newValue - 1);

            const { min, max } = getDatePartLimits('M', toDate(persianDate), 'dM');
            const newDay = fitIntoRange(day, min, max);

            persianDate.date(newDay);
            break;
        }

        case 'd':
            persianDate.date(intValue());
            break;

        case 'H':
            persianDate.hour(intValue());
            break;

        case 'h':
            persianDate.hour(intValue());
            break;

        case 'm':
            persianDate.minute(intValue());
            break;

        case 's':
            persianDate.second(intValue());
            break;

        case 'S':
            persianDate.milliseconds(intValue());
            break;
    }

    const newDate = toDate(persianDate);

    setParamsToDate(date, newDate);
};

const getDatePartLimits = (pattern, date, forcedPattern) => {
    const limits = {
        y: { min: 0, max: 9999 },
        M: { min: 1, max: 12 },
        L: { min: 1, max: 12 },
        d: { min: 1, max: 31 },
        dM: {
            min: 1, max: toPersian(date).endOf('month').date()
        },
        E: { min: 0, max: 6 },
        H: { min: 0, max: 23 },
        h: { min: 0, max: 23 },
        m: { min: 0, max: 59 },
        s: { min: 0, max: 59 },
        S: { min: 0, max: 999 },
        a: { min: 0, max: 1 }
    };

    return limits[forcedPattern || pattern[0]] || limits['getAmPm'];
};

const getPeriodNames = () => ['ق.ظ', 'ب.ظ'];

const getTimeSeparator = () => ':';

const is24HourFormat = dateFormat => {
    const amTime = new Date(2021, 12, 14, 11, 0, 0, 0);
    const pmTime = new Date(2021, 12, 14, 23, 0, 0, 0);
    const amTimeFormatted = format(amTime, dateFormat);
    const pmTimeFormatted = format(pmTime, dateFormat);

    for(let i = 0; i < amTimeFormatted.length; i++) {
        if(amTimeFormatted[i] !== pmTimeFormatted[i]) {
            return !isNaN(parseInt(amTimeFormatted[i]));
        }
    }
};

const getMaxMonthDay = (date) => toPersian(date).endOf('month').date();

// Date Box Function End


// Helpers Start

function setParamsToDate(date, newDate) {
    date.setDate(1);
    date.setMonth(newDate.getMonth());
    date.setFullYear(newDate.getFullYear());
    date.setDate(newDate.getDate());

    date.setHours(newDate.getHours(), newDate.getMinutes(), newDate.getSeconds(), newDate.getMilliseconds());
}

function getPersianDay(persianDate) {
    if(persianDate.day() === 6) {
        return 0;
    }

    return persianDate.day() + 1;
}

// Helpers End

const persianDateUtils = {
    format: format,
    getDayNames: getDayNames,
    getMonthNames: getMonthNames,

    getDate: getDate,
    getMonth: getMonth,
    firstDayOfWeekIndex: firstDayOfWeekIndex,
    getWeekNumber: getWeekNumber,
    getFirstMonthDate: getFirstMonthDate,
    getNextMonthDate: getNextMonthDate,
    getLastMonthDate: getLastMonthDate,
    getFirstMonthDateInYear: getFirstMonthDateInYear,
    getLastMonthDateInYear: getLastMonthDateInYear,
    getYear: getYear,
    getFirstYearInDecade: getFirstYearInDecade,
    getFirstDecadeInCentury: getFirstDecadeInCentury,
    getPreviousYearDate: getPreviousYearDate,
    getNextYearDate: getNextYearDate,
    getNextDecadeDate: getNextDecadeDate,

    sameDate: sameDate,
    sameMonth: sameMonthAndYear,
    sameMonthAndYear: sameMonthAndYear,
    sameYear: sameYear,
    sameDecade: sameDecade,
    sameCentury: sameCentury,

    createDateWithFullYear: createDateWithFullYear,

    dateInRange: dateInRange,
    getShortDateFormat: getShortDateFormat,

    shiftDate: shiftDate,
    areDatesInNeighborView: areDatesInNeighborView,
    areDatesInSameView: areDatesInSameView,
    getDateByOffset: getDateByOffset,
    getMonthsOffset: getMonthsOffset,
    getViewsOffset: getViewsOffset,
    sameView: sameView,
    getViewFirstCellDate: getViewFirstCellDate,
    getViewLastCellDate: getViewLastCellDate,
    getViewMinBoundaryDate: getViewMinBoundaryDate,
    getViewMaxBoundaryDate: getViewMaxBoundaryDate,

    parse: parse,
    getDefaultDatePatternForFormat: getDefaultDatePatternForFormat,
    getDatePatternsForFormat: getDatePatternsForFormat,
    getDatePartValue: getDatePartValue,
    setDatePartValue: setDatePartValue,
    getDatePartLimits: getDatePartLimits,

    getPeriodNames: getPeriodNames,
    getTimeSeparator: getTimeSeparator,
    is24HourFormat: is24HourFormat,

    // Ui Date Util Start

    FORMATS_MAP: {
        'date': 'd/M/yyyy',
        'time': 'm:h',
        'datetime': 'm:h d/M/yyyy'
    },
    MIN_DATEVIEW_DEFAULT_DATE: new Date(1921, 2, 21),
    MAX_DATEVIEW_DEFAULT_DATE: function() {
        return toDate(toPersian(new Date())
            .add(50, 'year')
            .endOf('year')
            .hours(23).minutes(59).second(59));
    }(),

    DATE_COMPONENTS_INFO: {
        'year': {
            getter: (value) => toPersian(value).year(),
            setter: (date, value) => setDatePartValue(date, 'y', value),
            formatter: function(value, date) {
                const formatDate = new Date(date.getTime());
                persianDateUtils.setDatePartValue(formatDate, 'y', value);
                return persianDateUtils.format(formatDate, 'yyyy');
            },
            startValue: undefined,
            endValue: undefined
        },

        'month': {
            getter: (value) => toPersian(value).month(),
            setter: (date, value) => setDatePartValue(date, 'M', value + 1),
            formatter: function(value, date) {
                const formatDate = new Date(date.getTime());
                persianDateUtils.setDatePartValue(formatDate, 'M', value + 1);
                return persianDateUtils.format(formatDate, 'MMMM');
            },
            startValue: 0,
            endValue: 11
        },

        'day': {
            getter: (value) => toPersian(value).date(),
            setter: (date, value) => setDatePartValue(date, 'd', value),
            formatter: function(value, date) {
                const formatDate = new Date(date.getTime());
                persianDateUtils.setDatePartValue(formatDate, 'd', value);
                return persianDateUtils.format(formatDate, 'd');
            },
            startValue: 1,
            endValue: undefined
        },

        'hours': uiDateUtils.DATE_COMPONENTS_INFO.hours,

        'minutes': uiDateUtils.DATE_COMPONENTS_INFO.minutes,

        'seconds': uiDateUtils.DATE_COMPONENTS_INFO.seconds,

        'milliseconds': uiDateUtils.DATE_COMPONENTS_INFO.milliseconds
    },

    getMaxMonthDay: getMaxMonthDay

    // Ui Date Util End
};

export default persianDateUtils;
