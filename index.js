/**
 * `autocomplete` type prompt
 */

var _ = require('lodash');
var chalk = require('chalk');
var figures = require('figures');
var Base = require('inquirer/lib/prompts/base');
var Choices = require('inquirer/lib/objects/choices');
var observe = require('inquirer/lib/utils/events');
var Paginator = require('inquirer/lib/utils/paginator');
var ansiEscapes = require('ansi-escapes');
var fuzzy = require('fuzzy');
var {
  map,
  share,
  filter,
  takeUntil,
  takeWhile
} = require('rxjs/operators');

class CheckboxAutoCompletePrompt extends Base {
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    if (!this.opt.choices && !this.opt.asyncSource) {
      this.throwParamError('choices || asyncSource');
    }

    if (this.opt.choices) {
      this.source = this.opt.choices;
    }

    this.selection = [];

    if (_.isArray(this.opt.default)) {
      this.selection = (new Choices(this.opt.default)).filter(choice => choice)
    }

    this.filterChoices = new Choices([]);

    this.firstRender = true;
    this.selected = 0;

    // Make sure no default is set (so it won't be printed)
    this.opt.default = null;
    this.opt.pageSize = this.opt.pageSize || 7;

    this.paginator = new Paginator();
  }


  /**
   * Start the Inquiry session
   * @param  {Function} cb      Callback when prompt is done
   * @return {this}
   */

  _run(cb) {

    var self = this;
    self.done = cb;

    if (self.rl.history instanceof Array) {
      self.rl.history = [];
    }

    var events = observe(self.rl);

    var validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    events.tabKey = events.keypress.pipe(filter(function(e) {
      return e.key.name === 'tab';
    }), share());

    events.normalizedUpKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));

    events.normalizedDownKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));

    events.spaceKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onSpaceKey.bind(this));

    events.tabKey
      .pipe(takeWhile(dontHaveAnswer))
      .forEach(self.onTabKey.bind(this));

    events.keypress.pipe(filter(function(e) {
      var filterKeys = ['down', 'up', 'space', 'tab'];
      return filterKeys.indexOf(e.key.name) < 0;
    }), share()).pipe(takeWhile(dontHaveAnswer)).forEach(self.onKeyPress.bind(this));

    function dontHaveAnswer() {
      return self.status !== 'answered';
    }

    //call once at init
    self.search(null);

    return this;
  }

  /**
   * Render the prompt to screen
   * @return {Prompt} self
   */

  render(error) {
    // Render question
    var content = this.getQuestion();
    var bottomContent = '';

    this.rl.line = String(this.rl.line).trim()

    if (this.firstRender) {
      content += chalk.dim('(Use arrow keys or type to search)');
    }
    // Render choices or answer depending on the state
    if (this.status === 'answered') {
      content += chalk.cyan(_.map(this.selection, 'short').join(', '))
    } else if (this.searching) {
      content += this.rl.line;
      bottomContent += '  ' + chalk.dim('Searching...');
    } else if (this.filterChoices.length) {
      var choicesStr = this.listRender(this.selection, this.filterChoices, this.selected);
      content += this.rl.line;
      bottomContent += this.paginator.paginate(choicesStr, this.selected, this.opt.pageSize);
    } else {
      content += this.rl.line;
      bottomContent += '  ' + chalk.yellow('No results...');
    }

    if (this.status !== 'answered' && this.selection.length) {
      bottomContent += '\nAlready selected ' + chalk.cyan(this.selection.length) +
        ' items : ' + chalk.cyan(_.map(this.selection, 'short').join(', '))
    }

    if (error) {
      bottomContent += '\n' + chalk.red('>> ') + error;
    }

    this.firstRender = false;

    this.screen.render(content, bottomContent);
  }


  /**
   * When user press `enter` key
   */

  onEnd(state) {
    this.status = 'answered';

    // Rerender prompt (and clean subline error)
    this.render();
    this.screen.done();
    this.done(state.value);
  }

  onError(state) {
    this.render(state.isValid);
  }

  search(searchTerm) {
    var self = this;
    self.selected = 0;

    searchTerm = searchTerm ? searchTerm.trim() : searchTerm;

    //only render searching state after first time
    if (self.searchedOnce) {
      self.searching = true;
      self.filterChoices = new Choices([]);
      self.render(); //now render current searching state
    } else {
      self.searchedOnce = true;
    }

    self.lastSearchTerm = searchTerm;

    if (!self.opt.asyncSource) {
      var choices = self.source.choices;

      if (self.firstRender) {
        self.firstRender = false;

        var selection = choices.filter(this.getChecked.bind(this));

        if (selection.length) {
          self.selection = selection;
        }
      }

      if (searchTerm) {
        choices = fuzzy.filter(searchTerm || '', self.source.realChoices, {
          extract: (el) => el.name || el.short || el.value
        }).map((el) => el.original);
      }

      self.filterChoices = new Choices(choices);
      self.searching = false;
      self.render();
    } else {
      var thisPromise = self.opt.asyncSource(self.answers, searchTerm);
      // store this promise for check in the callback
      self.lastPromise = thisPromise;
      return thisPromise.then(function inner(choices) {
        //if another search is triggered before the current search finishes, don't set results
        if (thisPromise !== self.lastPromise) return;

        if (self.firstRender) {
          self.firstRender = false;

          var selection = choices.filter(self.getChecked.bind(self));
          if (selection.length) {
            self.selection = selection;
          }
        }

        if (searchTerm) {
          choices = fuzzy
            .filter(searchTerm || '', choices, {
              extract: (el) => el.name || el.short || el.value
            })
            .filter(function(choice) {
              return choice.type !== 'separator';
            }).map((el) => el.original);
        }

        self.filterChoices = new Choices(choices);
        self.searching = false;
        self.render();
      });
    }
  }

  ensureSelectedInRange() {
    var selectedIndex = Math.min(this.selected, this.filterChoices.length); //not above filterChoices length - 1
    this.selected = Math.max(selectedIndex, 0); //not below 0
  }


  onKeyPress() {
    this.render(); //rendr input automatically
    //Only search if input have actually changed, not because of other keypresses
    if (this.lastSearchTerm !== this.rl.line) {
      this.search(this.rl.line); //trigger new search
    }
  }

  getCurrentValue() {
    return _.map(this.selection, 'value');
  }

  onTabKey() {
    if (this.filterChoices.getChoice(this.selected)) {
      this.rl.write(ansiEscapes.cursorLeft);
      var autoCompleted = this.filterChoices.getChoice(this.selected).value;
      this.rl.write(ansiEscapes.cursorForward(autoCompleted.length));
      this.rl.line = autoCompleted
      this.render();
      this.search(this.rl.line); //trigger new search
    }
  }

  onUpKey() {
    var len = this.filterChoices.length;
    this.selected = (this.selected > 0) ? this.selected - 1 : len - 1;
    this.ensureSelectedInRange();
    this.render();
  }

  onDownKey() {
    var len = this.filterChoices.length;
    this.selected = (this.selected < len - 1) ? this.selected + 1 : 0;
    this.ensureSelectedInRange();
    this.render();
  }

  onSpaceKey() {
    this.toggleChoice(this.selected);
    this.render();
  }

  toggleChoice(index) {
    var item;
    if (!this.opt.asyncSource && this.source.choices.length === this.filterChoices.length) {
      item = this.source.choices[index];
    } else {
      item = this.filterChoices.getChoice(index);
    }

    if (item !== undefined && item.value) {
      var checked = this.getChecked(item);

      if (checked) {
        this.selection = this.selection.filter(v => v.value !== item.value)
      } else {
        this.selection.push(item)
      }
      item.checked = !checked;
    }
  }


  /**
   * Function for rendering checkbox choices
   * @param  {Number} pointer Position of the pointer
   * @return {String}         Rendered content
   */

  listRender(selection, choices, pointer) {
    var output = '';
    var separatorOffset = 0;

    choices.forEach((choice, i) => {
      if (choice.type === 'separator') {
        output += '  ' + choice.line;
      } else {
        var isSelected = (i - separatorOffset === pointer);
        output += isSelected ? chalk.cyan(figures.pointer) : ' ';
        output += ' ' + getCheckbox(this.getChecked(choice, selection)) + ' ' + choice.name;
      }

      output += '\n';
    });

    return output.replace(/\n$/, '');
  }

  getChecked(item, selection) {
    selection = selection || this.selection;
    return item.checked === true || _.map(selection, 'value').indexOf(item.value) >= 0;
  }

}


/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */

function getCheckbox(checked) {
  return checked ? chalk.green(figures.radioOn) : figures.radioOff;
}

/**
 * Module exports
 */

module.exports = CheckboxAutoCompletePrompt;
