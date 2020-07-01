import 'chai/register-expect';
import { convertFromFhir } from '../fhirConversionTools.js';

import nonQuestionnaireResource from './fixtures/nonQuestionnaireResource';
import questionnaireRandomEntryMode from './fixtures/questionnaireRandomEntryMode';
import questionnaireValueSetAnswer from './fixtures/questionnaireValueSetAnswer.json';
import questionnaireUnsupportedItemType from './fixtures/questionnaireUnsupportedItemType';
import questionnaireUnsupportedExpressionLanguage from './fixtures/questionnaireUnsupportedExpressionLanguage.json';
import questionnareValueCodingNoDisplay from './fixtures/questionnaireValueCodingNoDisplay.json';

describe('Error handling tests', function() {
  it('should throw an error when presented with a non-Questionnaire resource', function(){
    expect(convertFromFhir.bind(convertFromFhir, nonQuestionnaireResource)).to.throw(
      'Only FHIR Questionnaire resources are supported.');
  });
  
  it('should throw an error when presented with an entry mode that is not supported', function(){
    expect(convertFromFhir.bind(convertFromFhir, questionnaireRandomEntryMode)).to.throw(
      'sdc-questionnaire-entryMode extension does not specify a supported entry mode.');
  });

  it('should throw an error when presented with an item with an answerValueSet', function(){
    expect(convertFromFhir.bind(convertFromFhir, questionnaireValueSetAnswer)).to.throw(
      'Answer value sets are not currently supported.');
  });

  it('should throw an error when presented with an item with an unsupported type', function(){
    expect(convertFromFhir.bind(convertFromFhir, questionnaireUnsupportedItemType)).to.throw(
      'Unsupported item type.');
  });

  it('should throw an error when presented with an unsupported expression language', function(){
    expect(convertFromFhir.bind(convertFromFhir, questionnaireUnsupportedExpressionLanguage)).to.throw(
      'sdc-questionnaire-calculatedExpression extension does not specify a supported language.');
  });

  it('should throw an error if an answerOption has a valueCoding with no display property', function(){
    expect(convertFromFhir.bind(convertFromFhir, questionnareValueCodingNoDisplay)).to.throw(
      'Answer valueCoding with no display property.');
  });
});