/**
 * List prompt example
 */

'use strict';
var inquirer = require('inquirer');
var _ = require('lodash');
var fuzzy = require('fuzzy');

inquirer.registerPrompt('autocomplete', require('./index'));

var states = [
  'Alabama',
  'Alaska',
  'American Samoa',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'District Of Columbia',
  'Federated States Of Micronesia',
  'Florida',
  'Georgia',
  'Guam',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Marshall Islands',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Northern Mariana Islands',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Palau',
  'Pennsylvania',
  'Puerto Rico',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virgin Islands',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming'
];

var foods = [
  'Apple',
  'Orange',
  new inquirer.Separator(),
  'Banana',
  'Kiwi',
  'Lichi',
  'Grapefruit',
]

function searchStates(answers, input) {
  input = input || '';
  return new Promise(function(resolve) {
    setTimeout(function() {
      try {
        var fuzzyResult = fuzzy.filter(input, states);
        resolve(fuzzyResult.map(function(el) {
          return el.original;
        }));
      } catch (e) {
        console.log(e);
      }
    }, _.random(30, 500));
  });
}

inquirer.prompt([{
    type: 'autocomplete',
    name: 'fruit',
    message: 'What is your favorite fruit?',
    choices: foods,
    pageSize: 4,
    validate: function(val) {
      return val ?
        true :
        'Type something!';
    }
  },

  {
    type: 'autocomplete',
    name: 'state',
    message: 'Select a state to travel from',
    // choices: states,
    validate: function(answer) {
      if (answer.length < 1) {
        return 'You must choose at least one topping.';
      }
      return true;
    },
    asyncSource: searchStates
      // default: ['Alaska']
  }
]).then(function(answers) {
  console.log(JSON.stringify(answers, null, 2));
});
