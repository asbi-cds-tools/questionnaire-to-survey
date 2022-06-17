
/**
 * Converts an object representing parsed FHIR Questionnaire JSON to the format expected by SurveyJS.
 * See: https://surveyjs.io/Documentation/Library#objects
 * @param {object} fhirJson - Object resulting from parsing the JSON of a FHIR Questionnaire resource
 * @returns {object} surveyJson - The converted Object
 */
 export function convertFromFhir(fhirJson) {
  // Make sure this a Questionnaire resource
  if (fhirJson.resourceType != 'Questionnaire') {
    throw new Error('Only FHIR Questionnaire resources are supported.');
  }

  // Check to see whether this conforms to the SDC Questionnaire profile
  let sdcRegExp = /^http:\/\/hl7\.org\/fhir\/uv\/sdc\/StructureDefinition\/sdc-questionnaire/;
  // eslint-disable-next-line no-unused-vars
  if (fhirJson.meta && fhirJson.meta.profile) {
    let usingSdcProfile = fhirJson.meta.profile.map(profile => sdcRegExp.test(profile)).reduce((a,b) => a || b);
  }

  // Determine the entry mode of the Questionnaire
  let entModRegExp = /^http:\/\/hl7\.org\/fhir\/uv\/sdc\/StructureDefinition\/sdc-questionnaire-entryMode/;
  let entModExt = fhirJson.extension ? fhirJson.extension.filter(ext => entModRegExp.test(ext.url))[0] : null;
  if (entModExt) {
    if (!['sequential', 'prior-edit', 'random'].includes(entModExt.valueCode)) {
      throw new Error('sdc-questionnaire-entryMode extension does not specify a supported entry mode.');
    }
  } else { // Default to 'prior-edit'
    entModExt = {
      valueCode: 'prior-edit'
    };
  }

  // TODO: REPLACE REFERENCES TO CONTAINED RESOURCES WITH COPIES OF THE ACTUAL RESOURCES

  // Initialize our converted SurveyJS JSON
  let surveyJson = {};
  // We assume that only one question is shown at a time, per the supported entry mode (prior-edit)
  if (entModExt.valueCode === 'random') {
    surveyJson.questions = []; // each `item` in FHIR Questionnaire corresponds to a `question` in SurveyJS
  } else { // 'sequential' or 'prior-edit'
    surveyJson.pages = []; // each `item` in FHIR Questionnaire corresponds to a `page` in SurveyJS
    if (entModExt.valueCode === 'sequential') {
      // with a 'sequential' edit mode you can't change answers or go back
      surveyJson.goNextPageAutomatic = true;
      surveyJson.showNavigationButtons = false;
    }
  }

  surveyJson.calculatedValues = []; // calculatedValues are top-level elements in SurveyJS

  // Loop over each of the items in the Questionnaire and convert them
  fhirJson.item.forEach(item => {
    let {converted, calculatedValues} = convertItem(item); // Recursive function call
    if (entModExt.valueCode === 'random') {
      // Wrap each converted item in an object, one question per page, and add it to `pages` array
      surveyJson.questions.push(Object.assign({}, converted));
    } else { // 'sequential' or 'prior-edit'
      // Wrap each converted item in an object, one question per page, and add it to `pages` array
      surveyJson.pages.push({questions: [Object.assign({}, converted)]});
    }
    if (Object.keys(calculatedValues).length > 0) {
      surveyJson.calculatedValues.push(calculatedValues);
    }
  });
  // Make sure everything is flat, otherwise things will be missed by SurveyJS.
  surveyJson.calculatedValues = surveyJson.calculatedValues.flat(10);
  return surveyJson;
}

/**
 * Converts a single item element from a FHIR Questionnaire into a format acceptable to SurveyJS.
 * @param {object} item - An item element from a FHIR Questionnaire
 * @returns {object} Contains the item formatted for SurveyJS as well as any calculated value expressions.
 */
export function convertItem(item) {
  // Basic properties
  let converted =  {
    name: item.linkId,
    type: typeMap(item.type, item.repeats),
    inputType: inputTypeMap(item.type)
  };

  // Get the item's title, which may be calculated by an expression
  let extendedText = getTextExtensions(item._text); // Note: https://www.hl7.org/fhir/json.html#primitive
  let calculatedValues = [];
  if (extendedText.calculated.length > 0) {
    converted.title = "";
    extendedText.calculated.forEach(ext => { // See: getTextExtensions()
      converted.title = converted.title + ' ' + '{' + Object.keys(ext)[0] + '}';
      calculatedValues.push({
        name: Object.keys(ext)[0],
        expression: Object.values(ext)[0]
      });
    });
  } else {
    converted.title = item.text;
  }

  // Consider HTML formatted text
  if (extendedText.html) converted.html = extendedText.html;

  // Consider visibility conditions
  let visibility = extractVisibility(item);
  if (visibility.conditions) converted.visibleIf = visibility.conditions;
  if (Object.keys(visibility.expressions).length > 0) {
    // element.calculatedValues contains referenced calculated value expressions, which must be
    // bubbled up to the top of the converted JSON
    calculatedValues.push(visibility.expressions);
  }

  if (item.required) {
    if (visibility.conditions) {
      converted.requiredIf = visibility.conditions;
    } else {
      converted.isRequired = true;
    }
  }

  // Extract the answers for this item
  let choices = extractAnswers(item);
  if (choices) converted.choices = choices;

  // Extract any expressions used in place for the response
  let calcRegExp = /^http:\/\/hl7\.org\/fhir\/uv\/sdc\/StructureDefinition\/sdc-questionnaire-calculatedExpression/;
  let calcExts = item.extension ? item.extension.filter(ext => calcRegExp.test(ext.url)) : null;
  if (calcExts) {
    calcExts.forEach((ext, idx) => {
      if (idx > 0) {
        throw new Error('Only one calculatedExpression allowed per item.')
      }
      let valExp = ext.valueExpression;
      if (valExp && valExp.language == 'text/cql') {
        converted.type = 'expression';
        converted.expression = `evaluateExpression('${valExp.expression}')`;
      } else {
        throw new Error('sdc-questionnaire-calculatedExpression extension does not specify a supported language.');
      }
    });
  }

  // Process child items
  if (item.item) {
    converted.elements = [];
    item.item.forEach(itm => {
      let element = convertItem(itm); // Note recursion
      // element.converted contains the converted child item
      converted.elements.push(element.converted);
      if (Object.keys(element.calculatedValues).length > 0) {
        // element.calculatedValues contains referenced calculated value expressions, which must be
        // bubbled up to the top of the converted JSON
        calculatedValues.push(element.calculatedValues);
      }
    });
  }
  // Need to return the converted item and the calculated values separately, since SurveyJS expects
  // all calculated values to be defined at the top level in the JSON.
  return {
    converted: converted,
    calculatedValues: calculatedValues
  };
}

/**
 * A function for mapping FHIR Questionnaire item types to what SurveyJS expects
 * @param {string} fhirItemType - The type of the FHIR item
 * @param {boolean} fhirItemRepeats - A flag that when true indicates that an item can have multiple answers
 * @returns {string|Error} - The corresponding type in SurveyJS
 */
export function typeMap(fhirItemType, fhirItemRepeats = false) {
  switch(fhirItemType) {
    case 'boolean': return 'boolean';
    case 'choice': return fhirItemRepeats ? 'checkbox' : 'radiogroup';
    case 'date': return 'text';
    case 'dateTime': return 'text';
    case 'decimal': return 'text';
    case 'display': return 'html';
    case 'group': return 'panel';
    case 'integer': return 'text';
    case 'string': return 'text';
    case 'text': return 'comment';
    case 'time': return 'text';
    case 'url': return 'text';
    default:
      throw new Error('Unsupported item type.');
  }
}

/**
 * 
 * @param {string} fhirItemType 
 * @returns {string|null}
 */
export function inputTypeMap(fhirItemType) {
  switch(fhirItemType) {
    case 'date': return 'date';
    case 'dateTime': return 'datetime-local';
    case 'decimal': return 'text';
    case 'integer': return 'number';
    case 'string': return 'text';
    case 'time': return 'time';
    case 'url': return 'url';
    default: null
  }
}

/**
 * Converts the answers from a FHIR Questionnaire item to a format suitable for SurveyJS.
 * @param {object} item - A FHIR Questionnaire item
 * @returns {array} answers - The answers from the item converted to SurveyJS
 */
export function extractAnswers(item) {
  if (item.answerValueSet) {
    throw new Error('Answer value sets are not currently supported.');
  } else if (item.answerOption) {
    let answers = [];
    item.answerOption.forEach(ans => {
      let val = getAnswerValue(ans);
      let extRegExp = /^http:\/\/hl7\.org\/fhir\/StructureDefinition\/ordinalValue/;
      let ordValExt = ans.extension ?
        ans.extension.filter(ext => extRegExp.test(ext.url)) :
        [{valueDecimal: 0}];
      answers.push({
        value: val,
        text: String(val),
        ordinalValue: ordValExt[0].valueDecimal
      });
    });
    return answers;
  } else return null;
}

/**
 * Takes an item.answerOption and returns the value[x] element.
 * @param {object} ans - An answer from item.answerOption
 * @returns{*} - The value[x] element from item.answerOption
 */
export function getAnswerValue(ans) {
  if (ans.valueInteger) return ans.valueInteger;
  else if (ans.valueDate) return ans.valueDate;
  else if (ans.valueTime) return ans.valueTime;
  else if (ans.valueString) return ans.valueString;
  else if (ans.valueCoding) {
    if (ans.valueCoding.display) return ans.valueCoding.display;
    else throw new Error('Answer valueCoding with no display property.');
  }
  else if (ans.valueRefernce) throw new Error('valueReferences not currently supported in answers.');
  else throw new Error('Unsupported value[x] in an answerOption.');
}

/**
 * Takes a FHIR.Questionnaire.item.text object and formats any extensions so they can be used by SurveyJS.
 * @param {object} text - May contain various extensions for FHIR Questionnaire.item.text element
 * @returns {object} extendedText - May contain markup or dynamic text to be generated by a library
 */
export function getTextExtensions(text) {
  let extendedText = {
    html: new String(),
    calculated: []
  };
  if (text === undefined) return extendedText;

  // First look for any mark-up
  let htmlRegExp = /^http:\/\/hl7\.org\/fhir\/StructureDefinition\/rendering-xhtml/;
  let htmlExts = text.extension.filter(ext => htmlRegExp.test(ext.url));
  htmlExts.forEach(ext => extendedText.html = extendedText.html + ext.valueString);

  // Then look for calculated values
  let calcRegExp = /^http:\/\/hl7\.org\/fhir\/StructureDefinition\/cqf-calculatedValue/;
  let calcExts = text.extension.filter(ext => calcRegExp.test(ext.url));
  calcExts.forEach(ext => {
    let key = `${ext.valueString}`;
    let value = `evaluateExpression('${ext.valueString}')`;
    extendedText.calculated.push({[key]: value});
  });

  return extendedText;
}

/**
 * Checks a FHIR Questionnaire.item for any enable (visibility) conditions and converts them to SurveyJS.
 * @param {object} item - A FHIR Questionnaire.item
 * @returns{string} visibleIf - Visibility conditions for item which have been formatted for SurveyJS
 */
export function extractVisibility(item) {
  let visibleIf = {
    conditions: '',
    expressions: []
  };
  // Visibility controlled by enableWhen expressions
  let visConds = item.enableWhen;
  if (visConds) {
    // Ensure visConds is an array
    visConds = Array.isArray(visConds) ? visConds : [visConds];
    // item.enableBehavior controls how multiple enableWhen conditions are combined
    let behave = item.enableBehavior ? item.enableBehavior : 'all';
    let behaviorOperator = behave == 'all' ? ' and ' : ' or '; // all->and & any->or
    visibleIf.conditions = visConds.map(cond => {
      let condAnswer = Object.keys(cond).filter(key => /^answer/.test(key)); // extract answer[x]
      if (cond.operator == 'exists') return `{${cond.question}} != undefined`; // special case
      else if (condAnswer == 'answerCoding') {
        return `{${cond.question}} ${cond.operator} '${cond[condAnswer].display}'`;
      }
      else return `{${cond.question}} ${cond.operator} '${cond[condAnswer]}'`;
    }).reduce((c1,c2) => {
      if (!c2) return c1;
      else return c1 + behaviorOperator + c2
    });
  }
  // Visibility controlled by enableWhenExpression
  let calcRegExp = /^http:\/\/hl7\.org\/fhir\/uv\/sdc\/StructureDefinition\/sdc-questionnaire-enableWhenExpression/;
  let expConds = item.extension ? item.extension.filter(ext => calcRegExp.test(ext.url)) : null;
  if (expConds) {
    expConds.forEach((ext, idx) => { // TODO: ADD SUPPORT FOR MULTIPLE EXPRESSIONS
      if (idx > 0) {
        throw new Error('Only one enableWhenExpression allowed per item.')
      }
      let valExp = ext.valueExpression;
      if (valExp && valExp.language == 'text/cql') {
        let enableExp = valExp.expression;
        visibleIf.conditions = '{' + enableExp + '} == true'; // TODO: ADD SUPPORT FOR COMBINING WITH ENABLEWHEN CONDITIONS
        visibleIf.expressions.push({
          name: `${enableExp}`,
          expression: `evaluateExpression('${enableExp}')`
        });
      } else {
        throw new Error('sdc-questionnaire-enableWhenExpression extension does not specify a supported language.');
      }
    });
  }
  return visibleIf;
}
