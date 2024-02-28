import * as coda from '@codahq/packs-sdk';

export const PaymentDetailsSchema = coda.makeObjectSchema({
  properties: {
    avsResultCode: {
      type: coda.ValueType.String,
      description: 'The response code from the address verification system (AVS). The code is always a single letter.',
    },
    bin: {
      type: coda.ValueType.String,
      description:
        "The issuer identification number (IIN), formerly known as bank identification number (BIN) of the customer's credit card. This is made up of the first few digits of the credit card number.",
    },
    company: {
      type: coda.ValueType.String,
      description: "The name of the company that issued the customer's credit card.",
    },
    cvvResultCode: {
      type: coda.ValueType.String,
      description:
        'The response code from the credit card company indicating whether the customer entered the card security code, or card verification value, correctly. The code is a single letter or empty string.',
    },
    expirationMonth: {
      type: coda.ValueType.Number,
      description: 'The month in which the used credit card expires.',
    },
    expirationYear: {
      type: coda.ValueType.Number,
      description: 'The year in which the used credit card expires.',
    },
    name: {
      type: coda.ValueType.String,
      description: 'The holder of the credit card.',
    },
    number: {
      type: coda.ValueType.String,
      description: "The customer's credit card number, with most of the leading digits redacted.",
    },
    paymentMethodName: {
      type: coda.ValueType.String,
      description: 'The name of payment method used by the buyer.',
    },
    wallet: {
      type: coda.ValueType.String,
      description: 'Digital wallet used for the payment.',
    },
  },
  displayProperty: 'company',
});
