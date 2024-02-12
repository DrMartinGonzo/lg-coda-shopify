import * as coda from '@codahq/packs-sdk';

export const PaymentDetailsSchema = coda.makeObjectSchema({
  properties: {
    credit_card_bin: {
      type: coda.ValueType.String,
      fromKey: 'credit_card_bin',
      fixedId: 'credit_card_bin',
      description:
        "The issuer identification number (IIN), formerly known as bank identification number (BIN) of the customer's credit card. This is made up of the first few digits of the credit card number.",
    },
    avs_result_code: {
      type: coda.ValueType.String,
      fixedId: 'avs_result_code',
      fromKey: 'avs_result_code',
      description:
        'The response code from the address verification system. The code is always a single letter. Refer to this chart for the codes and their definitions.',
    },
    cvv_result_code: {
      type: coda.ValueType.String,
      fixedId: 'cvv_result_code',
      fromKey: 'cvv_result_code',
      description:
        'The response code from the credit card company indicating whether the customer entered the card security code, or card verification value, correctly. The code is a single letter or empty string; see this chart for the codes and their definitions.',
    },
    credit_card_number: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_number',
      fromKey: 'credit_card_number',
      description: "The customer's credit card number, with most of the leading digits redacted.",
    },
    credit_card_company: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_company',
      fromKey: 'credit_card_company',
      description: "The name of the company that issued the customer's credit card.",
    },
    credit_card_name: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_name',
      fromKey: 'credit_card_name',
      description: 'The holder of the credit card.',
    },
    credit_card_wallet: {
      type: coda.ValueType.String,
      fixedId: 'credit_card_wallet',
      fromKey: 'credit_card_wallet',
      description: 'The wallet type where this credit card was retrieved from.',
    },
    credit_card_expiration_month: {
      type: coda.ValueType.Number,
      fixedId: 'credit_card_expiration_month',
      fromKey: 'credit_card_expiration_month',
      description: 'The month in which the credit card expires.',
    },
    credit_card_expiration_year: {
      type: coda.ValueType.Number,
      fixedId: 'credit_card_expiration_year',
      fromKey: 'credit_card_expiration_year',
      description: 'The year in which the credit card expires.',
    },
    // TODO: buyer_action_info
    /*
    Example return value, but need to find the correct exact schema. On dirait que la clé dépend de payment_method_name
        "buyer_action_info": {
          "multibanco": {
            "Entity": "12345",
            "Reference": "999999999"
          }
        },
    */
    /*
    buyer_action_info: {
      type: coda.ValueType.String,
      fixedId: 'buyer_action_info',
      fromKey: 'buyer_action_info',
      useThousandsSeparator: false,
      description:
        'Details for payment methods that require additional buyer action to complete the order transaction.',
    },
    */
    payment_method_name: {
      type: coda.ValueType.String,
      fixedId: 'payment_method_name',
      fromKey: 'payment_method_name',
      description: 'The name of the payment method used by the buyer to complete the order transaction.',
    },
  },
  displayProperty: 'payment_method_name',
});
