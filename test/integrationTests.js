import 'chai/register-expect';
import { default as converter } from '../main.js';

import questionnaireBasic from './fixtures/questionnaireOneQuestion.json';
import questionnaireOrdinalValue from './fixtures/questionnaireOrdinalValue.json';
import questionnaireCalculatedValue from './fixtures/questionnaireCalculatedValue.json';

describe('Basic integration with SurveyJS', function() {
  it('should correctly convert a Questionnaire with answerOption items', function(){
    let basic = converter(questionnaireBasic);
    expect(basic).to.exist;
    expect(basic.calculatedValues).to.have.length(0);
    expect(basic.pages[0].elementsValue[0].propertyHash.choices[0].itemValue).to.equal('First choice');
    expect(basic.pages[0].elementsValue[0].propertyHash.choices[1].itemValue).to.equal('Second choice');
    expect(basic.pages[0].elementsValue[0].propertyHash.choices[2].itemValue).to.equal('Third choice');
  });

  it('should add an ordinal value to each element', function(){
    let ordinal = converter(questionnaireOrdinalValue);
    expect(ordinal).to.exist;
    expect(ordinal.calculatedValues).to.have.length(0);
    expect(ordinal.pages[0].elementsValue[0].propertyHash.choices[0].propertyHash['ordinalValue']).to.equal(1);
    expect(ordinal.pages[0].elementsValue[0].propertyHash.choices[1].propertyHash['ordinalValue']).to.equal(2);
    expect(ordinal.pages[0].elementsValue[0].propertyHash.choices[2].propertyHash['ordinalValue']).to.equal(3);
  });

  it('should register any evaluateExpression function that is provided', function(){
    let myFunc = function(name) { return true };
    let calculated = converter(questionnaireCalculatedValue, myFunc);
    expect(calculated).to.exist;
    expect(calculated.calculatedValues).to.have.length(1);
  });

  it('should throw an error if evaluateExpression() is null but there are referencing calculated values', function(){
    expect(converter.bind(converter, questionnaireCalculatedValue)).to.throw(
      'Null-valued evaluateExpression() is referenced by at least one calculatedValue.');
  });
});