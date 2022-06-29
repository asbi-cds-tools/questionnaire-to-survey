# Questionnaire to Survey
This project was created to allow surveys defined as Fast Healthcare Interoperability Resources (FHIR<sup>&reg;</sup>) [Questionnaires](https://www.hl7.org/fhir/questionnaire.html) to be used with the [SurveyJS library](https://github.com/surveyjs/survey-library). The goal is to broaden the ecosystem of tools for implementing FHIR<sup>&reg;</sup> Questionnaires in practice.

## Background
*Questionnaire to Survey* was designed to support clinical decision support (CDS) in the area of alcohol screening and brief intervention (ASBI). That application has shaped the specific features that are currently supported in the underlying standards and technologies described in this section.

### FHIR Questionnaire
[Questionnaire](https://www.hl7.org/fhir/questionnaire.html) is one of the many [interoperable resources](http://hl7.org/fhir/resourcelist.html) defined by the Health Level 7 (HL7<sup>&reg;</sup>) [FHIR<sup>&reg;</sup> standard](http://hl7.org/fhir/). The Questionnaire resource allows a set of questions and allowable responses to be represented in an open and standard way. Each Questionnaire is defined by a set of both required and optional data elements, which are [by design](https://www.hl7.org/fhir/questionnaire.html#sdc) general in nature in order to support the capabilities most likely to be found in most healthcare systems. *Questionnaire to Survey* is currently focused on supporting the Questionnaire elements needed for the ASBI CDS application.

### Structured Data Capture (SDC)
The base FHIR<sup>&reg;</sup> specification is meant to be an [80% solution](https://www.hl7.org/fhir/overview-arch.html#principles) for healthcare interoperability. Mechanisms such as extensions, profiles, and implementation guides [provide a means](https://www.hl7.org/fhir/extensibility.html) in which use cases outside this 80% can be addressed. The [Structured Data Capture (SDC) implementation guide](http://build.fhir.org/ig/HL7/sdc/) defines how more complex Questionnaire functionality and behavior can be expressed. Examples of additional complexity include advanced rendering of Questionnaires and the ability to provide dynamic updates via logical expressions (see "Clinical Quality Language (CQL)" below).

### Clinical Quality Language (CQL)
[CQL](https://cql.hl7.org/) is a domain-specific programming language focused on clinical quality applications, including CDS as well as electronic clinical quality measures (eCQMs). Logical expressions written in CQL are human-readable but can also be compiled to a machine-friendly format to facilitate implementation. *Questionnaire to Survey* allows CQL expressions referenced in a Questionnaire to be executed by SurveyJS via a function provided by the user.

### SurveyJS
[SurveyJS](https://github.com/surveyjs/survey-library) is a JavaScript library for rendering surveys and forms in a web browser and capturing user responses. While it provides many capabilities which are similiar to those described by FHIR<sup>&reg;</sup> and SDC, it is not currently able to ingest FHIR<sup>&reg;</sup> Questionnaires. *Questionnaire to Survey* is intended to fill this gap by translating FHIR<sup>&reg;</sup> Questionnaires into a format acceptable to SurveyJS.

## Limitations
There are a number of important limitations potential users should be made aware of before using *Questionnaire to Survey*.

### Supported Front-End Frameworks
As of version 2.0.0, *Questionnaire to Survey* in theory supports the same front-end frameworks that are supported by [SurveyJS](https://surveyjs.io/Overview/Library/):
- [Angular](https://angular.io/)
- [jQuery](https://jquery.com/)
- [KnockOut](https://knockoutjs.com/)
- [React](https://reactjs.org/)
- [Vue.js](https://vuejs.org/)

SurveyJS [survey-vue](https://www.npmjs.com/package/survey-vue) had been included as a direct dependency in earlier versions of *Questionnaire to Survey* but has been removed in version 2.0.0. So it or one of the other SurveyJS packages (e.g., [survey-react](https://www.npmjs.com/package/survey-react)) must be included when using *Questionnaire to Survey*. The following snippet shows example usage with survey-vue:

```js
import converter from 'questionnaire-to-survey'; // converter() is a function that returns another function
import { FunctionFactory, Model, Serializer, StylesManager } from 'survey-vue';
const vueConverter = converter(FunctionFactory, Model, Serializer, StylesManager);
// Create a SurveyJS object from a FHIR Questionnaire
var model = vueConverter(questionnaire);
```

### Supported Elements
The following Questionnaire elements are currently supported:

| Element | Mapping to SurveyJS | Notes & Limitations   |
| ------- | ------------------- | --------------------- |
| `item.linkID` | `question.name` |     |
| `item.type`   | `question.type`   | Only items of type `['boolean', 'choice', 'date', 'dateTime', 'decimal', 'display', 'group', 'integer', 'string', 'text', 'time', 'url']` are currently supported. See `typeMap()` in [fhirConversionTools](fhirConversionTools.js#L170).  |
| `item.text`   | `question.title`  |   |
| `item._text`  | `question.html`   | Any item [rendering-xhtml extensions](https://www.hl7.org/fhir/extension-rendering-xhtml.html) are added to `question.html`.  |
| `item.answerOption`   | `question.choices`    | `['valueInteger', 'valueDate', 'valueTime', 'valueString', 'valueCoding']` are the currently supported `answerOption` value choices. See `extractAnswers()` and `getAnswerValues()`.   |
| `item.answerValueSet` | `question.choices` | You must provide a `resolver()` function that takes in the Canonical reference to a ValueSet resource and returns an object with the parsed JSON representation of that resource. |
| `item.enableWhen` | `question.visibleIf`  | The FHIR<sup>&reg;</sup> specification [says](https://www.hl7.org/fhir/questionnaire-definitions.html#Questionnaire.item.enableWhen) "not enabled" can either mean not visible or that answers cannot be captured; we interpret to the former when mapping to SurveyJS. See `extractVisibility()`.  |
| `item.enableBehavior` | `question.visibleIf`  | Multiple `enableWhen` conditions are combined into a single `visibleIf` expression using the specified `enableBehavior`. See `extractVisibility()`.   |

### Supported Extensions
The following FHIR<sup>&reg;</sup> and SDC extensions are currently supported:

| Name | URL | Notes & Limitations |
| --- | --- | --- |
| `sdc-questionnaire-entryMode` | [http://build.fhir.org/ig/HL7/sdc/ValueSet-entryMode.html](http://build.fhir.org/ig/HL7/sdc/ValueSet-entryMode.html) | \*\***NEW**\*\* `random`, `sequential`, and `prior-edit` entry modes are all supported. See `./test/conversionTests.js` for a simple example. Default value is `prior-edit`. |
| `sdc-questionnaire-calculatedExpression` | [http://build.fhir.org/ig/HL7/sdc/StructureDefinition-sdc-questionnaire-calculatedExpression.html](http://build.fhir.org/ig/HL7/sdc/StructureDefinition-sdc-questionnaire-calculatedExpression.html) | Can be an extension on any `item`; only one calculated expression per `item`. Is used to calculate an answer to a question. Currently only CQL expressions are supported. |
| `ordinalValue` | [https://www.hl7.org/fhir/extension-ordinalvalue.html](https://www.hl7.org/fhir/extension-ordinalvalue.html) | Used to assign scores or weights question answer options. |
| `rendering-xhtml` | [https://www.hl7.org/fhir/extension-rendering-xhtml.html](https://www.hl7.org/fhir/extension-rendering-xhtml.html) | Used to inject XHTML into question text (via `question.html`); multiple `rendering-xhtml` extensions on a single `item._text` will be concatenated. |
| `cqf-calculatedValue` | [https://www.hl7.org/fhir/extension-cqf-calculatedvalue.html](https://www.hl7.org/fhir/extension-cqf-calculatedvalue.html) | Can be on any `item._text`; multiple `cqf-calculatedValue` extensions on a single `item._text` will be concatenated. Used to inject dynamically-generated text into `question.text`. Currently only CQL expressions are supported. |
| `sdc-questionnaire-enableWhenExpression` | [http://build.fhir.org/ig/HL7/sdc/StructureDefinition-sdc-questionnaire-enableWhenExpression.html](http://build.fhir.org/ig/HL7/sdc/StructureDefinition-sdc-questionnaire-enableWhenExpression.html) | CQL expressions can be used to control the visibility of `items` in the survey. These will override any specified `item.enableWhen` and `item.enableBehavior` elements. |

## Usage

### Setup
This project manages dependencies using the [Node Package Manager](https://www.npmjs.com/). *Questionnaire to Survey* can be built locally by typing `npm install` at the command line. It is published on npm and can be installed in project via: `npm install questionnaire-to-survey`.

### Tests
See the `tests` folder for a number of automated tests which demonstrate the functionality of *Questionnaire to Survey*. They are written using the [Mocha](https://mochajs.org/) JavaScript testing framework. After setup the tests can be run from the command line using `npm run test`.

### Example
A working example of using *Questionnaire to Survey* can be found in the [ASBI Screening App](https://github.com/asbi-cds-tools/asbi-screening-app).

### Generating QuestionnaireResponse resources from completed surveys

As of Version 2.3.0, *Questionnaire to Survey* exports a function for converting the output of SurveyJS into QuestionnaireResponse resources.  Example usage:

```js
import converter, { responser } from 'questionnaire-to-survey'
import { FunctionFactory, ItemValue, Model, Serializer, StylesManager, Survey } from 'survey-react'
import "survey-react/defaultV2.min.css";

export default function SurveyComponent(props) {
  let {fhirQuestionnaire, saveResponses, resolver} = props;
  
  // Create a SurveyJS model that implements `fhirQuestionnaire`
  const reactConverter = converter(FunctionFactory, Model, Serializer, StylesManager, resolver);
  var model = reactConverter(fhirQuestionnaire, null, 'defaultV2');

  // A function for converting SurveyJS outputs into a FHIR QuestionnaireResponse
  const responseConverter = responser(fhirQuestionnaire, ItemValue);

  // A React component for our FHIR Questionnaire
  return (
    <Survey
      id="survey-root"
      model={model}
      showCompletedPage={false}
      onComplete={data => saveResponses(responseConverter(data))}
    />
  )
}
```

## Other FHIR<sup>&reg;</sup> Questionnaire / SDC Implementations
An incomplete list of other projects which can implement FHIR<sup>&reg;</sup> Questionnaires:
- [LForms](https://github.com/lhncbc/lforms): Capable of importing and rendering FHIR<sup>&reg;</sup> Questionnaires and supports many of the SDC extensions. Written using [AngularJS](https://angularjs.org/) and does not support CQL expression evaluation.

## License
(C) 2022 The MITRE Corporation. All Rights Reserved. Approved for Public Release: 20-0458. Distribution Unlimited.

Unless otherwise noted, this work is available under an Apache 2.0 license. It was produced by the MITRE Corporation for the National Center on Birth Defects and Developmental Disabilities, Centers for Disease Control and Prevention in accordance with the Statement of Work, contract number 75FCMC18D0047, task order number 75D30119F05691.

Some of the test fixtures have been constructed using examples from the FHIR Release 4 (Technical Correction #1) (v4.0.1) specification. (R) (C) HL7.org 2011+.
