var expect = require('chai').expect;
var sinon = require('sinon');
var Promise = require('bluebird');
var inquirer = require('inquirer');
var ReadlineStub = require('../helpers/readline');
var Prompt = require('../../index');

describe('inquirer-autocomplete-prompt', function () {
  var asyncSource;
  var prompt;
  var resolve;
  var reject;
  var promise;
  var rl;
  var defaultChoices;
  var promiseForAnswer;

  describe('Pass a choices', function () {

    beforeEach(function () {
      defaultChoices = ['foo', new inquirer.Separator(), 'bar', 'bum'];
      rl = new ReadlineStub();
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: defaultChoices
      }, rl);
    });

    it('applies choices', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: defaultChoices
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      moveDown();
      space();
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.have.lengthOf(1).to.include.members(['bar'])
      });
    });

    it('applies choices with default', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: defaultChoices,
        default: ['bar']
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      space();
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.have.lengthOf(2).to.include.members(['foo', 'bar'])
      });
    });

    it('applies validate', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: defaultChoices,
        validate: function (answer) {
          if (answer.length < 1) {
            return 'You must choose at least one topping.';
          } else {
            return true;
          }
        }
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      enter();
      space();
      enter();
      return promiseForAnswer.then(function (answer) {
        expect(answer).to.have.lengthOf(1).to.include.members(['foo']);
      });
    });

    it('searching', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: defaultChoices
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      type('um');
      space();
      rl.line = '';
      type('ba');
      space();
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.have.lengthOf(2).to.include.members(['bum', 'bar'])
      });
    });

    it('when tab pressed', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: defaultChoices
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      tab();
      space();
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.have.lengthOf(1).to.include.members(['foo'])
      });
    });

    it('cancel default value', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: defaultChoices,
        default: ['bar']
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      type('ba');
      space();
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.be.an('array').to.have.lengthOf(0)
      });
    });

    it('loops choices going down', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        choices: ['foo', new inquirer.Separator(), 'bar', 'bum']
      }, rl);
      promiseForAnswer = getPromiseForAnswer();
      moveDown();
      moveDown();
      moveDown();
      space();
      enter();
      return promiseForAnswer.then(function (answer) {
        expect(answer).to.have.lengthOf(1).to.include.members(['foo'])
      })
    });


    it('requires a name', function () {
      expect(function () {
        new Prompt({
          message: 'foo',
          choices: defaultChoices
        });

      }).to.throw(/name/);
    });

    it('requires a message', function () {
      expect(function () {
        new Prompt({
          name: 'foo',
          choices: defaultChoices
        });

      }).to.throw(/message/);
    });

    it('requires a choices or asyncSource parameter', function () {
      expect(function () {
        new Prompt({
          name: 'foo',
          message: 'foo',
        });

      }).to.throw(/choices\s\|\|\sasyncSource/);
    });

  });

  describe('Pass an asyncSource', function () {

    beforeEach(function () {
      defaultChoices = ['foo', new inquirer.Separator(), 'bar', 'bum'];

      promise = new Promise(function (res, rej) {
        resolve = res;
        reject = rej;
      });
      asyncSource = sinon.stub().returns(promise);

      rl = new ReadlineStub();
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        asyncSource: asyncSource
      }, rl);

    });

    it('applies asyncSource', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        asyncSource: asyncSource
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      resolve(defaultChoices);

      return promise.then(function () {
        moveDown();
        space();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.deep.equal(['bar']);
        });
      })

    });

    it('applies asyncSource with default', function () {
      prompt = new Prompt({
        message: 'test',
        name: 'name',
        asyncSource: asyncSource,
        default: ['bar']
      }, rl);

      promiseForAnswer = getPromiseForAnswer();
      resolve(defaultChoices);

      return promise.then(function () {
        space();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.have.lengthOf(2).to.include.members(['foo', 'bar'])
        });
      })

    });

    it('immediately calls asyncSource with null', function () {
      prompt.run();
      sinon.assert.calledOnce(asyncSource);
      sinon.assert.calledWithExactly(asyncSource, undefined, null);
    });

    describe('when it has some results', function () {
      var promiseForAnswer;
      beforeEach(function () {
        prompt = new Prompt({
          message: 'test',
          name: 'name',
          asyncSource: asyncSource
        }, rl);
        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);
        return promise;
      });

      it('should move selected cursor on keypress', function () {
        moveDown();
        space();
        enter();
        return promiseForAnswer.then(function (answer) {
          expect(answer).to.have.lengthOf(1).to.include.members(['bar'])
        })
      });

      it('moves up and down', function () {
        moveDown();
        moveDown();
        moveUp();
        space();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.have.lengthOf(1).to.include.members(['bar'])
        })
      });

      it('loops choices going down', function () {
        moveDown();
        moveDown();
        moveDown();

        space();
        enter();
        return promiseForAnswer.then(function (answer) {
          expect(answer).to.have.lengthOf(1).to.include.members(['foo'])
        })
      });

      it('loops choices going up', function () {
        moveUp();
        space();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.have.lengthOf(1).to.include.members(['bum'])
        })
      })
    });

    describe('searching', function () {
      beforeEach(function () {
        prompt.run();
        asyncSource.reset();
        asyncSource.returns(promise);
      });

      it('searches after each char when user types', function () {
        type('a');
        sinon.assert.calledWithExactly(asyncSource, undefined, 'a');
        type('bba');
        sinon.assert.calledWithExactly(asyncSource, undefined, 'ab');
        sinon.assert.calledWithExactly(asyncSource, undefined, 'abb');
        sinon.assert.calledWithExactly(asyncSource, undefined, 'abba');
        sinon.assert.callCount(asyncSource, 4);
      });

      it('does not search again if same searchterm (not input added)', function () {
        type('ice');
        sinon.assert.calledThrice(asyncSource);
        asyncSource.reset();
        typeNonChar();
        sinon.assert.notCalled(asyncSource);
      });

    });
  });



  function getPromiseForAnswer() {
    return prompt.run();
  }

  function typeNonChar() {
    rl.input.emit('keypress', '', {
      name: 'shift'
    });
  }

  function type(word) {
    word.split('').forEach(function (char) {
      rl.line = rl.line + char;
      rl.input.emit('keypress', char)
    });
  }

  function moveDown() {
    rl.input.emit('keypress', '', {
      name: 'down'
    });
  }

  function moveUp() {
    rl.input.emit('keypress', '', {
      name: 'up'
    });
  }

  function enter() {
    rl.emit('line');
  }

  function space() {
    rl.input.emit('keypress', '', {
      name: 'space'
    });
  }

  function tab() {
    rl.input.emit('keypress', '', {
      name: 'tab'
    });
  }

})
