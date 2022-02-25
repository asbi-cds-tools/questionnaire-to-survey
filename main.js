import { convertFromFhir } from './fhirConversionTools.js';

// TODO: Fill in function signature
/**
 * 
 * @param {*} FunctionFactory 
 * @param {*} Model 
 * @param {*} Serializer 
 * @param {*} StylesManager 
 */
export default function(FunctionFactory, Model, Serializer, StylesManager) {

  /**
   * Generates a SurveyJS Model using a FHIR Questionnaire resource.
   * @param {object} fhirJson - Object resulting from parsing the JSON of a FHIR Questionnaire resource.
   * @param {function} evaluateExpression - A function for asynchronously evaluating CQL expressions. 
   * Takes as its input the name of a CQL expression and returns a dummy boolean value. SurveyJS assumes 
   * the result of the expression is returned via a call to this.returnResult(), which it attaches to 
   * this function when it is registered.
   * @param {string} styleTheme - The name of the SurveyJS theme to use in the model.
   * @returns {object} model - The SurveyJS model resulting from the conversion.
   */
  return function (fhirJson, evaluateExpression = null, styleTheme = null) {
    // Need to add ordinalValue as a custom value on each answer item
    Serializer.addProperty('itemvalue', 'ordinalValue:number');

    // Add a CQL Processor for evaluating expressions
    if (evaluateExpression) FunctionFactory.Instance.register('evaluateExpression', evaluateExpression, true);

    // Convert the FHIR Questionnaire JSON to JSON formatted for SurveyJS
    let surveyJson = convertFromFhir(fhirJson);

    // Check to ensure that evaluateExpression() isn't null if it is being referenced by any calculatedValues
    let expRegExp = /evaluateExpression\(/;
    surveyJson.calculatedValues.forEach(calc => {
      if (evaluateExpression == null && expRegExp.test(calc.expression)) {
        throw new Error('Null-valued evaluateExpression() is referenced by at least one calculatedValue.');
      }
    });

    // Styling
    if (styleTheme) {
      StylesManager.applyTheme(styleTheme);
    }

    // Create a new SurveyJS Model based upon the converted JSON
    var model = new Model(surveyJson);

    // Return the model so it can (presumably) be rendered
    return model;
  }
}
