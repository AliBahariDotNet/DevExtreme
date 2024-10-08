import {
  Format,
} from './localization';

export interface FormatHelper {
  format(
    value: number | Date | null | undefined | string,
    format?: Format | Record<string, unknown>,
    calendarType?: string | null | undefined): string;
}

declare const formatHelper: FormatHelper;
export default formatHelper;
