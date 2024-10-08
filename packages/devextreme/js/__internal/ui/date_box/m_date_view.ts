import registerComponent from '@js/core/component_registrator';
import $ from '@js/core/renderer';
import dateUtils from '@js/core/utils/date';
import persianDateUtils from '@js/core/utils/date_persian';
import { extend } from '@js/core/utils/extend';
import { each } from '@js/core/utils/iterator';
import dateLocalization from '@js/localization/date';
import Editor from '@js/ui/editor/editor';

import uiDateUtils from './m_date_utils';
import DateViewRoller from './m_date_view_roller';

const DATEVIEW_CLASS = 'dx-dateview';
const DATEVIEW_COMPACT_CLASS = 'dx-dateview-compact';
const DATEVIEW_WRAPPER_CLASS = 'dx-dateview-wrapper';
const DATEVIEW_ROLLER_CONTAINER_CLASS = 'dx-dateview-rollers';
const DATEVIEW_ROLLER_CLASS = 'dx-dateviewroller';

const TYPE = {
  date: 'date',
  datetime: 'datetime',
  time: 'time',
};

const ROLLER_TYPE = {
  year: 'year',
  month: 'month',
  day: 'day',
  hours: 'hours',
};

const DateView = (Editor as any).inherit({
  _valueOption() {
    const value = this.option('value');
    const date = new Date(value);
    // @ts-expect-error
    return !value || isNaN(date) ? this._getDefaultDate() : date;
  },

  _getDefaultDate() {
    const date = new Date();

    if (this.option('type') === TYPE.date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    return date;
  },

  _getDefaultOptions() {
    return extend(this.callBase(), {
      type: TYPE.date,
      value: new Date(),
      applyCompactClass: false,
    });
  },

  _defaultOptionsRules() {
    return this.callBase().concat([
      {
        device(device) {
          return device.deviceType !== 'desktop';
        },
        options: {
          applyCompactClass: true,
        },
      },
    ]);
  },

  _render() {
    this.callBase();
    this.$element().addClass(DATEVIEW_CLASS);
    this._toggleFormatClasses(this.option('type'));
    this._toggleCompactClass();
  },

  _toggleFormatClasses(currentFormat, previousFormat) {
    this.$element().addClass(`${DATEVIEW_CLASS}-${currentFormat}`);

    previousFormat && this.$element().removeClass(`${DATEVIEW_CLASS}-${previousFormat}`);
  },

  _toggleCompactClass() {
    this.$element().toggleClass(DATEVIEW_COMPACT_CLASS, this.option('applyCompactClass'));
  },

  _wrapper() {
    return this._$wrapper;
  },

  _renderContentImpl() {
    this._$wrapper = $('<div>').addClass(DATEVIEW_WRAPPER_CLASS);
    this._renderRollers();
    this._$wrapper.appendTo(this.$element());
  },

  _renderRollers() {
    if (!this._$rollersContainer) {
      this._$rollersContainer = $('<div>').addClass(DATEVIEW_ROLLER_CONTAINER_CLASS);
    }

    this._$rollersContainer.empty();
    this._createRollerConfigs();

    this._rollers = {};

    const that = this;

    each(that._rollerConfigs, (name) => {
      const $roller = $('<div>').appendTo(that._$rollersContainer)
        .addClass(`${DATEVIEW_ROLLER_CLASS}-${that._rollerConfigs[name].type}`);

      that._rollers[that._rollerConfigs[name].type] = that._createComponent($roller, DateViewRoller, {
        items: that._rollerConfigs[name].displayItems,
        selectedIndex: that._rollerConfigs[name].selectedIndex,
        showScrollbar: 'never',
        scrollByContent: true,
        onStart(e) {
          const roller = e.component;
          roller._toggleActive(true);
          that._setActiveRoller(that._rollerConfigs[name], roller.option('selectedIndex'));
        },
        onEnd(e) {
          const roller = e.component;
          roller._toggleActive(false);
        },
        onClick(e) {
          const roller = e.component;
          roller._toggleActive(true);
          that._setActiveRoller(that._rollerConfigs[name], roller.option('selectedIndex'));
          that._setRollerState(that._rollerConfigs[name], roller.option('selectedIndex'));
          roller._toggleActive(false);
        },
        onSelectedIndexChanged(e) {
          const roller = e.component;
          that._setRollerState(that._rollerConfigs[name], roller.option('selectedIndex'));
        },
      });
    });
    that._$rollersContainer.appendTo(that._wrapper());
  },

  _createRollerConfigs(type) {
    const that = this;
    type = type || that.option('type');
    that._rollerConfigs = {};
    // @ts-expect-error
    dateLocalization.getFormatParts(this._getUiDateUtils().FORMATS_MAP[type]).forEach((partName) => {
      that._createRollerConfig(partName);
    });
  },

  _createRollerConfig(componentName) {
    const componentInfo = this._getUiDateUtils().DATE_COMPONENTS_INFO[componentName];

    const valueRange = this._calculateRollerConfigValueRange(componentName);
    const { startValue } = valueRange;
    const { endValue } = valueRange;

    const { formatter } = componentInfo;

    const curDate = this._getCurrentDate();

    const config = {
      type: componentName,
      setValue: componentInfo.setter,
      valueItems: [],
      displayItems: [],
      getIndex(value) {
        return componentInfo.getter(value) - startValue;
      },
    };

    for (let i = startValue; i <= endValue; i++) {
      // @ts-expect-error
      config.valueItems.push(i);
      // @ts-expect-error
      config.displayItems.push(formatter(i, curDate));
    }
    // @ts-expect-error
    config.selectedIndex = config.getIndex(curDate);

    this._rollerConfigs[componentName] = config;
  },

  _setActiveRoller(currentRoller) {
    const activeRoller = currentRoller && this._rollers[currentRoller.type];

    each(this._rollers, function () {
      this.toggleActiveState(this === activeRoller);
    });
  },

  _updateRollersPosition() {
    const that = this;
    each(this._rollers, function (type) {
      const correctIndex = that._rollerConfigs[type].getIndex(that._getCurrentDate());
      this.option('selectedIndex', correctIndex);
    });
  },

  _setRollerState(roller, selectedIndex) {
    if (selectedIndex !== roller.selectedIndex) {
      const rollerValue = roller.valueItems[selectedIndex];
      const { setValue } = roller;
      let currentValue = new Date(this._getCurrentDate());
      let currentDate = currentValue.getDate();
      const minDate = this.option('minDate');
      const maxDate = this.option('maxDate');

      if (!this._getDateUtils()) {
        if (roller.type === ROLLER_TYPE.month) {
          currentDate = Math.min(currentDate, uiDateUtils.getMaxMonthDay(currentValue.getFullYear(), rollerValue));
        } else if (roller.type === ROLLER_TYPE.year) {
          currentDate = Math.min(currentDate, uiDateUtils.getMaxMonthDay(rollerValue, currentValue.getMonth()));
        }

        currentValue.setDate(currentDate);
      }
      setValue(currentValue, rollerValue);

      const normalizedDate = dateUtils.normalizeDate(currentValue, minDate, maxDate);
      currentValue = uiDateUtils.mergeDates(normalizedDate, currentValue, 'time');
      currentValue = dateUtils.normalizeDate(currentValue, minDate, maxDate);

      this.option('value', currentValue);

      roller.selectedIndex = selectedIndex;
    }

    if (roller.type === ROLLER_TYPE.year) {
      this._refreshRollers();
    }

    if (roller.type === ROLLER_TYPE.month) {
      this._refreshRoller(ROLLER_TYPE.day);
      this._refreshRoller(ROLLER_TYPE.hours);
    }
  },

  _refreshRoller(rollerType) {
    const roller = this._rollers[rollerType];

    if (roller) {
      this._createRollerConfig(rollerType);
      const rollerConfig = this._rollerConfigs[rollerType];
      if (rollerType === ROLLER_TYPE.day || rollerConfig.displayItems.toString() !== roller.option('items').toString()) {
        roller.option({
          items: rollerConfig.displayItems,
          selectedIndex: rollerConfig.selectedIndex,
        });
      }
    }
  },

  _getCurrentDate() {
    const curDate = this._valueOption();
    const minDate = this.option('minDate');
    const maxDate = this.option('maxDate');

    return dateUtils.normalizeDate(curDate, minDate, maxDate);
  },

  _calculateRollerConfigValueRange(componentName) {
    const _dateUtils = this._getDateUtils() || dateUtils;

    const curDate = this._getCurrentDate();
    const minDate = this.option('minDate');
    const maxDate = this.option('maxDate');

    const minYear = _dateUtils.sameYear(curDate, minDate);
    const minMonth = minYear && _dateUtils.sameMonth(curDate, minDate);
    const maxYear = _dateUtils.sameYear(curDate, maxDate);
    const maxMonth = maxYear && _dateUtils.sameMonth(curDate, maxDate);
    const minHour = minMonth && _dateUtils.sameDate(curDate, minDate);
    const maxHour = maxMonth && _dateUtils.sameDate(curDate, maxDate);

    const componentInfo = this._getUiDateUtils().DATE_COMPONENTS_INFO[componentName];
    let { startValue } = componentInfo;
    let { endValue } = componentInfo;

    if (componentName === ROLLER_TYPE.year) {
      startValue = _dateUtils.getYear(minDate);
      endValue = _dateUtils.getYear(maxDate);
    }

    if (componentName === ROLLER_TYPE.month) {
      if (minYear) {
        startValue = _dateUtils.getMonth(minDate);
      }
      if (maxYear) {
        endValue = _dateUtils.getMonth(maxDate);
      }
    }

    if (componentName === ROLLER_TYPE.day) {
      endValue = _dateUtils.getMaxMonthDay(curDate);
      if (minYear && minMonth) {
        startValue = _dateUtils.getDate(minDate);
      }
      if (maxYear && maxMonth) {
        endValue = _dateUtils.getDate(maxDate);
      }
    }

    if (componentName === ROLLER_TYPE.hours) {
      startValue = minHour ? minDate.getHours() : startValue;
      endValue = maxHour ? maxDate.getHours() : endValue;
    }

    return {
      startValue,
      endValue,
    };
  },

  _refreshRollers() {
    this._refreshRoller(ROLLER_TYPE.month);
    this._refreshRoller(ROLLER_TYPE.day);
    this._refreshRoller(ROLLER_TYPE.hours);
  },

  _optionChanged(args) {
    switch (args.name) {
      case 'minDate':
      case 'maxDate':
      case 'type':
        this._renderRollers();
        this._toggleFormatClasses(args.value, args.previousValue);
        break;
      case 'visible':
        this.callBase(args);
        if (args.value) {
          this._renderRollers();
        }
        break;
      case 'value':
        this.option('value', this._valueOption());
        this._refreshRollers();
        this._updateRollersPosition();
        break;
      default:
        this.callBase(args);
    }
  },

  _clean() {
    this.callBase();
    delete this._$rollersContainer;
  },

  _getCalendarType(): string {
    return this.option('calendarType') || '';
  },

  _getUiDateUtils(): any {
    switch (this._getCalendarType()) {
      case 'persian':
        return persianDateUtils;
      default:
        return uiDateUtils;
    }
  },

  _getDateUtils(): any {
    switch (this._getCalendarType()) {
      case 'persian':
        return persianDateUtils;
      default:
        return undefined;
    }
  },
});

registerComponent('dxDateView', DateView);

export default DateView;
