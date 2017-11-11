# inquirer-checkbox-autocomplete-checkbox-prompt

Autocomplete checkbox prompt for [inquirer](https://github.com/SBoudrias/Inquirer.js). (Inspired by inquirer-autocomplete-prompt)

[![Build Status](https://travis-ci.org/VeepC/inquirer-checkbox-autocomplete-prompt.svg?branch=master)](https://travis-ci.org/VeepC/inquirer-checkbox-autocomplete-prompt) [![codecov](https://codecov.io/gh/VeepC/inquirer-checkbox-autocomplete-prompt/branch/master/graph/badge.svg)](https://codecov.io/gh/VeepC/inquirer-checkbox-autocomplete-prompt)

## Installation

```
npm install --save inquirer-checkbox-autocomplete-prompt
```

## Usage


This prompt is anonymous, meaning you can register this prompt with the type name you please:

```javascript
inquirer.registerPrompt('checkbox-autocomplete', require('inquirer-checkbox-autocomplete-prompt'));
inquirer.prompt({
  type: 'checkbox-autocomplete',
  ...
})
```

Change `autocomplete` to whatever you might prefer.

### Options

> **Note:** _allowed options written inside square brackets (`[]`) are optional. Others are required._

`type`, `name`, `message`, [`choices`, `pageSize`, `filter`, `when`, `asyncSource`, `validate`]

See [inquirer](https://github.com/SBoudrias/Inquirer.js) readme for meaning of all except **asyncSource**.

**asyncSource** will be called with previous answers object and the current user input each time the user types, it **must** return a promise.

**Source** will be called once at at first before the user types anything with **null** as the value. If a new search is triggered by user input it maintains the correct order, meaning that if the first call completes after the second starts, the results of the first call are never displayed.


#### Example

```javascript
inquirer.registerPrompt('checkbox-autocomplete', require('inquirer-checkbox-autocomplete-prompt'));
inquirer.prompt([{
  type: 'checkbox-autocomplete',
  name: 'from',
  message: 'Select a state to travel from',
  choices: [
    'Apple',
    'Orange',
    'Banana',
    'Kiwi',
    'Lichi',
    'Grapefruit',
  ]
}]).then(function(answers) {
  //etc
});
```

or

```javascript
inquirer.registerPrompt('checkbox-autocomplete', require('inquirer-checkbox-autocomplete-prompt'));
inquirer.prompt([{
  type: 'checkbox-autocomplete',
  name: 'from',
  message: 'Select a state to travel from',
  asyncSource: function(answersSoFar, input) {
    return myApi.searchStates(input);
  }
}]).then(function(answers) {
  //etc
});
```

See also [example.js]() for a working example.

I recommend using this package with [fuzzy](https://www.npmjs.com/package/fuzzy) if you want fuzzy search. 

## Credits
[veepc](https://github.com/veepc/)

## License

ISC
