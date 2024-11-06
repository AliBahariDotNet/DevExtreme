import $ from '@js/core/renderer';
import type { Message } from '@js/ui/chat';
import type { WidgetOptions } from '@js/ui/widget/ui.widget';
import type { OptionChanged } from '@ts/core/widget/types';
import Widget from '@ts/core/widget/widget';

import type Chat from './chat';
import type { MessageTemplate } from './messagelist';

const CHAT_MESSAGEBUBBLE_CLASS = 'dx-chat-messagebubble';

export interface Properties extends WidgetOptions<MessageBubble> {
  text?: string;
  template?: MessageTemplate;
  templateData?: { component?: Chat; message?: Message };
}

class MessageBubble extends Widget<Properties> {
  _getDefaultOptions(): Properties {
    return {
      ...super._getDefaultOptions(),
      text: '',
      template: null,
      templateData: {},
    };
  }

  _initMarkup(): void {
    $(this.element())
      .addClass(CHAT_MESSAGEBUBBLE_CLASS);

    super._initMarkup();

    this._updateContent();
  }

  _updateContent(): void {
    const {
      text = '', template = null, templateData,
    } = this.option();

    if (template) {
      $(this.element()).empty();

      const messageTemplate = this._getTemplateByOption('template');

      messageTemplate.render({
        container: this.element(),
        model: templateData,
      });

      return;
    }

    $(this.element()).text(text);
  }

  _optionChanged(args: OptionChanged<Properties>): void {
    const { name } = args;

    switch (name) {
      case 'text':
      case 'template':
      case 'templateData':
        this._updateContent();
        break;
      default:
        super._optionChanged(args);
    }
  }
}

export default MessageBubble;
