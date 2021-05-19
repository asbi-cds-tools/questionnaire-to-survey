import 'chai/register-expect';
import { convertFromFhir } from '../fhirConversionTools.js';

import questionnaireOneQuestion from './fixtures/questionnaireOneQuestion.json';
import questionnaireMulitpleQuestions from './fixtures/questionnaireMultipleQuestions.json';
import questionnaireSupportedExpressionLanguage from './fixtures/questionnaireSupportedExpressionLanguage.json';
import questionnaireNestedItems from './fixtures/questionnaireNestedItems.json';
import { expect } from 'chai';

describe('Basic conversion tests', function() {
  it('should correctly convert a Questionnaire with a single item with answerOption', function(){
    let simple = convertFromFhir(questionnaireOneQuestion);
    expect(simple).to.exist;
    expect(simple.pages).to.exist;
    expect(simple.pages).to.have.lengthOf(1);
    expect(simple.pages[0].questions).to.have.lengthOf(1);
    expect(simple.pages[0].questions[0].name).to.equal('1');
    expect(simple.pages[0].questions[0].type).to.equal('radiogroup');
    expect(simple.pages[0].questions[0].title).to.equal('Here is a multiple choice question');
    expect(simple.pages[0].questions[0].html[0]).to.not.exist;
    expect(simple.pages[0].questions[0].choices).to.have.lengthOf(3);
    expect(simple.pages[0].questions[0].choices[0]).to.be.an('object').that.includes({
      value: 'First choice',
      text: 'First choice',
      ordinalValue: 0
    });
    expect(simple.pages[0].questions[0].choices[1]).to.be.an('object').that.includes({
      value: 'Second choice',
      text: 'Second choice',
      ordinalValue: 0
    });
    expect(simple.pages[0].questions[0].choices[2]).to.be.an('object').that.includes({
      value: 'Third choice',
      text: 'Third choice',
      ordinalValue: 0
    });
  });

  it('should correctly convert a Questionnaire with a multiple items of different types', function(){
    let simple = convertFromFhir(questionnaireMulitpleQuestions);
    expect(simple).to.exist;
    expect(simple.pages).to.exist;
    expect(simple.pages).to.have.lengthOf(3);

    expect(simple.pages[0].questions).to.have.lengthOf(1);
    expect(simple.pages[0].questions[0].name).to.equal('1');
    expect(simple.pages[0].questions[0].type).to.equal('radiogroup');
    expect(simple.pages[0].questions[0].title).to.equal('Here is a multiple choice question');
    expect(simple.pages[0].questions[0].html[0]).to.not.exist;
    expect(simple.pages[0].questions[0].choices).to.have.lengthOf(3);
    expect(simple.pages[0].questions[0].choices[0]).to.be.an('object').that.includes({
      value: 'First choice',
      text: 'First choice',
      ordinalValue: 0
    });
    expect(simple.pages[0].questions[0].choices[1]).to.be.an('object').that.includes({
      value: 'Second choice',
      text: 'Second choice',
      ordinalValue: 0
    });
    expect(simple.pages[0].questions[0].choices[2]).to.be.an('object').that.includes({
      value: 'Third choice',
      text: 'Third choice',
      ordinalValue: 0
    });

    expect(simple.pages[1].questions).to.have.lengthOf(1);
    expect(simple.pages[1].questions[0].name).to.equal('2');
    expect(simple.pages[1].questions[0].type).to.equal('boolean');
    expect(simple.pages[1].questions[0].title).to.equal('Here is a boolean question');
    expect(simple.pages[1].questions[0].html[0]).to.not.exist;
    expect(simple.pages[1].questions[0].choices).to.not.exist;

    expect(simple.pages[2].questions).to.have.lengthOf(1);
    expect(simple.pages[2].questions[0].name).to.equal('3');
    expect(simple.pages[2].questions[0].type).to.equal('html');
    expect(simple.pages[2].questions[0].title).to.equal('Here is a display only question');
    expect(simple.pages[2].questions[0].html).to.equal('Here is a display only question');
    expect(simple.pages[2].questions[0].choices).to.not.exist;
    
  });
});

describe('More complex conversion tests', function() {
  
  it('should correctly handle nested items', function(){
    let complex = convertFromFhir(questionnaireNestedItems);
    expect(complex).to.exist;
    expect(complex.pages).to.exist;
    expect(complex.pages).to.have.lengthOf(1);

    expect(complex.pages[0].questions).to.have.lengthOf(1);
    expect(complex.pages[0].questions[0].name).to.equal('1');
    expect(complex.pages[0].questions[0].type).to.equal('panel');
    expect(complex.pages[0].questions[0].title).to.equal('Here is a group question');

    expect(complex.pages[0].questions[0].elements).to.have.lengthOf(2);
    expect(complex.pages[0].questions[0].elements[0].name).to.equal('2');
    expect(complex.pages[0].questions[0].elements[0].type).to.equal('boolean');
    expect(complex.pages[0].questions[0].elements[0].title).to.equal('Here is a boolean question');
    expect(complex.pages[0].questions[0].elements[0].html[0]).to.not.exist;
    expect(complex.pages[0].questions[0].elements[0].choices).to.not.exist;

    expect(complex.pages[0].questions[0].elements[1].name).to.equal('3');
    expect(complex.pages[0].questions[0].elements[1].type).to.equal('html');
    expect(complex.pages[0].questions[0].elements[1].title).to.equal('Here is a display only question');
    expect(complex.pages[0].questions[0].elements[1].html).to.equal('Here is a display only question');
    expect(complex.pages[0].questions[0].elements[1].choices).to.not.exist;
    
  });

  it('should extract calculated expressions and place them in calculatedValues', function(){
    let complex = convertFromFhir(questionnaireSupportedExpressionLanguage);
    expect(complex).to.exist;
    expect(complex.calculatedValues).to.have.lengthOf(1);
  });

  it('should handle different entry modes appropriately', function() {

    let randomEntry = {...questionnaireMulitpleQuestions};
    randomEntry.extension = [
      {
        url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-entryMode',
        valueCode: 'random'
      }
    ];
    let randomQuestionnaire = convertFromFhir(randomEntry);
    expect(randomQuestionnaire.questions).to.have.lengthOf(3);
    expect(randomQuestionnaire.pages).to.not.exist;
    expect(randomQuestionnaire.goNextPageAutomatic).to.not.exist;
    expect(randomQuestionnaire.showNavigationButtons).to.not.exist;

    let sequentialEntry = {...questionnaireMulitpleQuestions};
    sequentialEntry.extension = [
      {
        url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-entryMode',
        valueCode: 'sequential'
      }
    ];
    let sequentialQuestionnaire = convertFromFhir(sequentialEntry);
    expect(sequentialQuestionnaire.pages).to.have.lengthOf(3);
    expect(sequentialQuestionnaire.questions).to.not.exist;
    expect(sequentialQuestionnaire.goNextPageAutomatic).to.equal(true);
    expect(sequentialQuestionnaire.showNavigationButtons).to.equal(false);

    let priorEditEntry = {...questionnaireMulitpleQuestions};
    priorEditEntry.extension = [
      {
        url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-entryMode',
        valueCode: 'prior-edit'
      }
    ];
    let priorEditQuestionnaire = convertFromFhir(priorEditEntry);
    expect(priorEditQuestionnaire.pages).to.have.lengthOf(3);
    expect(priorEditQuestionnaire.questions).to.not.exist;
    expect(priorEditQuestionnaire.goNextPageAutomatic).to.not.exist;
    expect(priorEditQuestionnaire.showNavigationButtons).to.not.exist;

  });

});