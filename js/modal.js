var feedbackUrl = 'https://spectrum-backend.herokuapp.com/feeds/feedback';

var SpectrumModal = {
  init: function () {
    var _this = this;
    render('../html/modal.html', undefined, function ($el) {
      _this.$modal = $el;
      _this.$form = $el.find('#spectrum-feedback-form');
      _this.$close = $el.find('.close');
      _this.$status = $el.find('#status');
      _this.$negativeOnly = $el.find('.negative-only');
      _this.$articleOnly = $el.find('.article-only');
      _this.$checkbox = $el.find('input[type=checkbox]');
      _this.$text = $el.find('input[type=text], textarea');
      _this.$type = $el.find('spectrum-type');

      $('body').append($el);

      // Send feedback
      _this.$form.on('submit.submitSpectrumFeedback', _this._sendFeedback.bind(_this));

      // Close modal
      _this.$close.on('click.closeSpectrumModal', function (e) {
        e.preventDefault();
        _this.$modal.hide();
      });
    });

    return _this;
  },

  setValue: function (key, value) {
    this[key] = value;
  },

  trigger: function ($trigger) {
    var _this = this;

    if (!$trigger) {
      return _this.$trigger;
    }

    if (_this.$trigger) {
      _this.$trigger.off('click.openSpectrumModal');
    }

    // Open and set up modal
    $trigger.on('click.openSpectrumModal', '.spectrum-open-modal', function (e) {
      e.preventDefault();
      var $parentCell = $(e.target).closest('.spectrum-feedback-area');
      _this.formProperties = Object.assign({}, e.target.dataset, $parentCell.data());

      _this.$checkbox.prop('checked', false)
      _this.$text.val('')

      if (_this.formProperties.associationId) {
        _this.$articleOnly.show();
        _this.$type.text('Article');
      } else {
        _this.$articleOnly.hide();
        _this.$type.text('News Source');
      }

      if (_this.formProperties.isNegative) {
        _this.$negativeOnly.show();
      } else {
        _this.$negativeOnly.hide();
      }

      _this.$modal.show();
    });
    return _this;
    _this.$trigger = $trigger;

  },

  _sendFeedback: function (e) {
    e.preventDefault();
    var _this = this;
    var data = this.formProperties;

    data.feedback_dict = {
      currentURL: _this.currentURL,
      fullURL: _this.fullURL,
    };

    $(e.target).serializeArray().forEach(function (input) {
      data.feedback_dict[input.name] = input.value;
    });

    data.feedback_dict = JSON.stringify(data.feedback_dict);

    data.feedback_version = _this.feedback_version;
    data.unique_id = _this.unique_id;
    data.username = _this.username;
    data.is_internal_user = _this.is_internal_user;

    $.ajax({
      url: feedbackUrl,
      data: data,
      type: 'POST',
    })
    .fail(function (req, textstatus, errorthrown) {
      if (req.responseJSON) {
        _this.$status.text('Failed to send feedback: ' + req.responseJSON.message);
      } else {
        _this.$status.text('Failed to send feedback');
      }
      _this.$status.attr('class', 'spectrum-status-error');
      logError('Failed to send feedback', req, textstatus, errorthrown);
    })
    .done(function (resp) {
      _this.$status.text(resp.message);
      _this.$status.attr('class', 'spectrum-status-success');
      setTimeout(function () {
        _this.$modal.hide();
        _this.$status.text('');
        _this.$status.attr('class', '');
      }, 2000);
    });

    return false;
  },
};
