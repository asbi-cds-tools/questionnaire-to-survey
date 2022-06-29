import { getAnswerType } from './fhirConversionTools.js';

/**
 * Returns a function that can convert the SurveyJS responses for a specified FHIR Questionnaire
 * @param {object} fhirQuestionnaire - Object resulting from parsing the JSON of a FHIR Questionnaire resource
 * @param {object} ItemValue - A SurveyJS object for working with item values
 * @returns {function}
 */
export function responser(fhirQuestionnaire, ItemValue) {

  /**
   * Converts SurveyJS responses into a FHIR QuestionnaireResponse
   * @param {object} sjsResponses - SurveyJS responses
   * @returns {object} - FHIR QuestionnaireResponse
   */
  return function responseConverter(sjsResponses) {
    // Define the QuestionnaireResponse which will contain the user responses.
    let questionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      questionnaire: fhirQuestionnaire.url,
      status: 'in-progress',
      item: [],
      authored: getCurrentISODate()
    };

    // Loop over Questionnaire and see which items have responses
    fhirQuestionnaire.item.forEach(qItem => {
      // Does this linkId show up in the response data?
      if (Object.keys(sjsResponses.data).includes(qItem.linkId)) {
        // Extract the response values (could be more than one)
        let responseValues = getResponseValues(qItem.linkId, sjsResponses);
        // Pull in the question metadata from SurveyJS
        const sjsQuestion = sjsResponses.getQuestionByName(qItem.linkId);
        let sjsValues = Array.isArray(sjsQuestion?.value) ? sjsQuestion?.value : [sjsQuestion?.value];
        // Use ItemValue to retreve the custom properties we added in main.js
        sjsValues = sjsValues.map(val => {
          const value = ItemValue.getItemByValue(sjsQuestion?.choices, val);
          return {
            value: value?.value,
            ordinalValue: value?.ordinalValue,
            coding: {
              code: value?.valueCodingCode,
              system: value?.valueCodingSystem,
              display: value?.valueCodingDisplay
            },
            type: value?.valueType
          }
        });
        // Construct the QuestionnaireResponse item
        let qrItem = {
          linkId: qItem.linkId,
          answer: responseValues.map(rv => {
            if (qItem.type == 'choice') {
              const valIdx = sjsValues.findIndex(val => val?.value == rv);
              const type = sjsValues[valIdx].type;
              if (type == 'coding') {
                return {
                  valueCoding: sjsValues[valIdx]?.coding
                }
              } else {
                return {
                  [type]: rv
                }
              }
            } else {
              const type = qItem.type;
              const valueType = 'value' + type.charAt(0).toUpperCase() + type.slice(1);
              return {
                [valueType]: rv
              }
            }
          })
        };
        // Push the item onto the QR
        questionnaireResponse.item.push(qrItem)
      }
    });
    return questionnaireResponse;
  }
}
  
function getResponseValues(linkId, sjsResponses) {
  let responseValues = sjsResponses.data[linkId];
  responseValues = Array.isArray(responseValues) ? responseValues : [responseValues];
  return responseValues;
}

export function getCurrentISODate() {
  let now = new Date(Date.now()); // Date.now() returns [millisecods]
  let timeZoneCorrection = now.getTimezoneOffset() * 60 * 1000; // [minutes] * [seconds/minutes] * [milliseconds/second]
  let correctedDate = new Date(now.getTime() - timeZoneCorrection);
  return correctedDate.toISOString().slice(0,-1);//.split('T')[0]; // just the date portion
}