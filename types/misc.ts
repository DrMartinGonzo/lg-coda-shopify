import * as coda from '@codahq/packs-sdk';

export interface FormatFunction {
  (data: any, context?: coda.ExecutionContext): any;
}

/**
 * Type definition for the parameter used to pass in a batch of updates to a
 * sync table update function, without previousValues property.
 */
export interface SyncUpdateNoPreviousValues
  extends Omit<coda.SyncUpdate<string, string, coda.ObjectSchemaDefinition<string, string>>, 'previousValue'> {}

/**
 * Copié directement depuis ./admin.types.d.ts, sinon l'import
 * foire quand c'est pris directement d'un fichier *.d.ts
 * @see https://lukasbehal.com/2017-05-22-enums-in-declaration-files/
 // TODO: voir si ya plus simple pour que ça garde ça au moins synchro, peut-être au niveau de graphql-codegen ?
 */
/**
 * The code designating a country/region, which generally follows ISO 3166-1 alpha-2 guidelines.
 * If a territory doesn't have a country code value in the `CountryCode` enum, then it might be considered a subdivision
 * of another country. For example, the territories associated with Spain are represented by the country code `ES`,
 * and the territories associated with the United States of America are represented by the country code `US`.
 */
export const countryCodes = [
  {
    display: 'Ascension Island',
    value: 'AC',
  },
  {
    display: 'Andorra',
    value: 'AD',
  },
  {
    display: 'United Arab Emirates',
    value: 'AE',
  },
  {
    display: 'Afghanistan',
    value: 'AF',
  },
  {
    display: 'Antigua & Barbuda',
    value: 'AG',
  },
  {
    display: 'Anguilla',
    value: 'AI',
  },
  {
    display: 'Albania',
    value: 'AL',
  },
  {
    display: 'Armenia',
    value: 'AM',
  },
  {
    display: 'Netherlands Antilles',
    value: 'AN',
  },
  {
    display: 'Angola',
    value: 'AO',
  },
  {
    display: 'Argentina',
    value: 'AR',
  },
  {
    display: 'Austria',
    value: 'AT',
  },
  {
    display: 'Australia',
    value: 'AU',
  },
  {
    display: 'Aruba',
    value: 'AW',
  },
  {
    display: 'Åland Islands',
    value: 'AX',
  },
  {
    display: 'Azerbaijan',
    value: 'AZ',
  },
  {
    display: 'Bosnia & Herzegovina',
    value: 'BA',
  },
  {
    display: 'Barbados',
    value: 'BB',
  },
  {
    display: 'Bangladesh',
    value: 'BD',
  },
  {
    display: 'Belgium',
    value: 'BE',
  },
  {
    display: 'Burkina Faso',
    value: 'BF',
  },
  {
    display: 'Bulgaria',
    value: 'BG',
  },
  {
    display: 'Bahrain',
    value: 'BH',
  },
  {
    display: 'Burundi',
    value: 'BI',
  },
  {
    display: 'Benin',
    value: 'BJ',
  },
  {
    display: 'St. Barthélemy',
    value: 'BL',
  },
  {
    display: 'Bermuda',
    value: 'BM',
  },
  {
    display: 'Brunei',
    value: 'BN',
  },
  {
    display: 'Bolivia',
    value: 'BO',
  },
  {
    display: 'Caribbean Netherlands',
    value: 'BQ',
  },
  {
    display: 'Brazil',
    value: 'BR',
  },
  {
    display: 'Bahamas',
    value: 'BS',
  },
  {
    display: 'Bhutan',
    value: 'BT',
  },
  {
    display: 'Bouvet Island',
    value: 'BV',
  },
  {
    display: 'Botswana',
    value: 'BW',
  },
  {
    display: 'Belarus',
    value: 'BY',
  },
  {
    display: 'Belize',
    value: 'BZ',
  },
  {
    display: 'Canada',
    value: 'CA',
  },
  {
    display: 'Cocos (Keeling) Islands',
    value: 'CC',
  },
  {
    display: 'Congo - Kinshasa',
    value: 'CD',
  },
  {
    display: 'Central African Republic',
    value: 'CF',
  },
  {
    display: 'Congo - Brazzaville',
    value: 'CG',
  },
  {
    display: 'Switzerland',
    value: 'CH',
  },
  {
    display: 'Côte d’Ivoire',
    value: 'CI',
  },
  {
    display: 'Cook Islands',
    value: 'CK',
  },
  {
    display: 'Chile',
    value: 'CL',
  },
  {
    display: 'Cameroon',
    value: 'CM',
  },
  {
    display: 'China',
    value: 'CN',
  },
  {
    display: 'Colombia',
    value: 'CO',
  },
  {
    display: 'Costa Rica',
    value: 'CR',
  },
  {
    display: 'Cuba',
    value: 'CU',
  },
  {
    display: 'Cape Verde',
    value: 'CV',
  },
  {
    display: 'Curaçao',
    value: 'CW',
  },
  {
    display: 'Christmas Island',
    value: 'CX',
  },
  {
    display: 'Cyprus',
    value: 'CY',
  },
  {
    display: 'Czechia',
    value: 'CZ',
  },
  {
    display: 'Germany',
    value: 'DE',
  },
  {
    display: 'Djibouti',
    value: 'DJ',
  },
  {
    display: 'Denmark',
    value: 'DK',
  },
  {
    display: 'Dominica',
    value: 'DM',
  },
  {
    display: 'Dominican Republic',
    value: 'DO',
  },
  {
    display: 'Algeria',
    value: 'DZ',
  },
  {
    display: 'Ecuador',
    value: 'EC',
  },
  {
    display: 'Estonia',
    value: 'EE',
  },
  {
    display: 'Egypt',
    value: 'EG',
  },
  {
    display: 'Western Sahara',
    value: 'EH',
  },
  {
    display: 'Eritrea',
    value: 'ER',
  },
  {
    display: 'Spain',
    value: 'ES',
  },
  {
    display: 'Ethiopia',
    value: 'ET',
  },
  {
    display: 'Finland',
    value: 'FI',
  },
  {
    display: 'Fiji',
    value: 'FJ',
  },
  {
    display: 'Falkland Islands',
    value: 'FK',
  },
  {
    display: 'Faroe Islands',
    value: 'FO',
  },
  {
    display: 'France',
    value: 'FR',
  },
  {
    display: 'Gabon',
    value: 'GA',
  },
  {
    display: 'United Kingdom',
    value: 'GB',
  },
  {
    display: 'Grenada',
    value: 'GD',
  },
  {
    display: 'Georgia',
    value: 'GE',
  },
  {
    display: 'French Guiana',
    value: 'GF',
  },
  {
    display: 'Guernsey',
    value: 'GG',
  },
  {
    display: 'Ghana',
    value: 'GH',
  },
  {
    display: 'Gibraltar',
    value: 'GI',
  },
  {
    display: 'Greenland',
    value: 'GL',
  },
  {
    display: 'Gambia',
    value: 'GM',
  },
  {
    display: 'Guinea',
    value: 'GN',
  },
  {
    display: 'Guadeloupe',
    value: 'GP',
  },
  {
    display: 'Equatorial Guinea',
    value: 'GQ',
  },
  {
    display: 'Greece',
    value: 'GR',
  },
  {
    display: 'South Georgia & South Sandwich Islands',
    value: 'GS',
  },
  {
    display: 'Guatemala',
    value: 'GT',
  },
  {
    display: 'Guinea-Bissau',
    value: 'GW',
  },
  {
    display: 'Guyana',
    value: 'GY',
  },
  {
    display: 'Hong Kong SAR',
    value: 'HK',
  },
  {
    display: 'Heard & McDonald Islands',
    value: 'HM',
  },
  {
    display: 'Honduras',
    value: 'HN',
  },
  {
    display: 'Croatia',
    value: 'HR',
  },
  {
    display: 'Haiti',
    value: 'HT',
  },
  {
    display: 'Hungary',
    value: 'HU',
  },
  {
    display: 'Indonesia',
    value: 'ID',
  },
  {
    display: 'Ireland',
    value: 'IE',
  },
  {
    display: 'Israel',
    value: 'IL',
  },
  {
    display: 'Isle of Man',
    value: 'IM',
  },
  {
    display: 'India',
    value: 'IN',
  },
  {
    display: 'British Indian Ocean Territory',
    value: 'IO',
  },
  {
    display: 'Iraq',
    value: 'IQ',
  },
  {
    display: 'Iran',
    value: 'IR',
  },
  {
    display: 'Iceland',
    value: 'IS',
  },
  {
    display: 'Italy',
    value: 'IT',
  },
  {
    display: 'Jersey',
    value: 'JE',
  },
  {
    display: 'Jamaica',
    value: 'JM',
  },
  {
    display: 'Jordan',
    value: 'JO',
  },
  {
    display: 'Japan',
    value: 'JP',
  },
  {
    display: 'Kenya',
    value: 'KE',
  },
  {
    display: 'Kyrgyzstan',
    value: 'KG',
  },
  {
    display: 'Cambodia',
    value: 'KH',
  },
  {
    display: 'Kiribati',
    value: 'KI',
  },
  {
    display: 'Comoros',
    value: 'KM',
  },
  {
    display: 'St. Kitts & Nevis',
    value: 'KN',
  },
  {
    display: 'North Korea',
    value: 'KP',
  },
  {
    display: 'South Korea',
    value: 'KR',
  },
  {
    display: 'Kuwait',
    value: 'KW',
  },
  {
    display: 'Cayman Islands',
    value: 'KY',
  },
  {
    display: 'Kazakhstan',
    value: 'KZ',
  },
  {
    display: 'Laos',
    value: 'LA',
  },
  {
    display: 'Lebanon',
    value: 'LB',
  },
  {
    display: 'St. Lucia',
    value: 'LC',
  },
  {
    display: 'Liechtenstein',
    value: 'LI',
  },
  {
    display: 'Sri Lanka',
    value: 'LK',
  },
  {
    display: 'Liberia',
    value: 'LR',
  },
  {
    display: 'Lesotho',
    value: 'LS',
  },
  {
    display: 'Lithuania',
    value: 'LT',
  },
  {
    display: 'Luxembourg',
    value: 'LU',
  },
  {
    display: 'Latvia',
    value: 'LV',
  },
  {
    display: 'Libya',
    value: 'LY',
  },
  {
    display: 'Morocco',
    value: 'MA',
  },
  {
    display: 'Monaco',
    value: 'MC',
  },
  {
    display: 'Moldova',
    value: 'MD',
  },
  {
    display: 'Montenegro',
    value: 'ME',
  },
  {
    display: 'St. Martin',
    value: 'MF',
  },
  {
    display: 'Madagascar',
    value: 'MG',
  },
  {
    display: 'North Macedonia',
    value: 'MK',
  },
  {
    display: 'Mali',
    value: 'ML',
  },
  {
    display: 'Myanmar (Burma)',
    value: 'MM',
  },
  {
    display: 'Mongolia',
    value: 'MN',
  },
  {
    display: 'Macao SAR',
    value: 'MO',
  },
  {
    display: 'Martinique',
    value: 'MQ',
  },
  {
    display: 'Mauritania',
    value: 'MR',
  },
  {
    display: 'Montserrat',
    value: 'MS',
  },
  {
    display: 'Malta',
    value: 'MT',
  },
  {
    display: 'Mauritius',
    value: 'MU',
  },
  {
    display: 'Maldives',
    value: 'MV',
  },
  {
    display: 'Malawi',
    value: 'MW',
  },
  {
    display: 'Mexico',
    value: 'MX',
  },
  {
    display: 'Malaysia',
    value: 'MY',
  },
  {
    display: 'Mozambique',
    value: 'MZ',
  },
  {
    display: 'Namibia',
    value: 'NA',
  },
  {
    display: 'New Caledonia',
    value: 'NC',
  },
  {
    display: 'Niger',
    value: 'NE',
  },
  {
    display: 'Norfolk Island',
    value: 'NF',
  },
  {
    display: 'Nigeria',
    value: 'NG',
  },
  {
    display: 'Nicaragua',
    value: 'NI',
  },
  {
    display: 'Netherlands',
    value: 'NL',
  },
  {
    display: 'Norway',
    value: 'NO',
  },
  {
    display: 'Nepal',
    value: 'NP',
  },
  {
    display: 'Nauru',
    value: 'NR',
  },
  {
    display: 'Niue',
    value: 'NU',
  },
  {
    display: 'New Zealand',
    value: 'NZ',
  },
  {
    display: 'Oman',
    value: 'OM',
  },
  {
    display: 'Panama',
    value: 'PA',
  },
  {
    display: 'Peru',
    value: 'PE',
  },
  {
    display: 'French Polynesia',
    value: 'PF',
  },
  {
    display: 'Papua New Guinea',
    value: 'PG',
  },
  {
    display: 'Philippines',
    value: 'PH',
  },
  {
    display: 'Pakistan',
    value: 'PK',
  },
  {
    display: 'Poland',
    value: 'PL',
  },
  {
    display: 'St. Pierre & Miquelon',
    value: 'PM',
  },
  {
    display: 'Pitcairn Islands',
    value: 'PN',
  },
  {
    display: 'Palestinian Territories',
    value: 'PS',
  },
  {
    display: 'Portugal',
    value: 'PT',
  },
  {
    display: 'Paraguay',
    value: 'PY',
  },
  {
    display: 'Qatar',
    value: 'QA',
  },
  {
    display: 'Réunion',
    value: 'RE',
  },
  {
    display: 'Romania',
    value: 'RO',
  },
  {
    display: 'Serbia',
    value: 'RS',
  },
  {
    display: 'Russia',
    value: 'RU',
  },
  {
    display: 'Rwanda',
    value: 'RW',
  },
  {
    display: 'Saudi Arabia',
    value: 'SA',
  },
  {
    display: 'Solomon Islands',
    value: 'SB',
  },
  {
    display: 'Seychelles',
    value: 'SC',
  },
  {
    display: 'Sudan',
    value: 'SD',
  },
  {
    display: 'Sweden',
    value: 'SE',
  },
  {
    display: 'Singapore',
    value: 'SG',
  },
  {
    display: 'St. Helena',
    value: 'SH',
  },
  {
    display: 'Slovenia',
    value: 'SI',
  },
  {
    display: 'Svalbard & Jan Mayen',
    value: 'SJ',
  },
  {
    display: 'Slovakia',
    value: 'SK',
  },
  {
    display: 'Sierra Leone',
    value: 'SL',
  },
  {
    display: 'San Marino',
    value: 'SM',
  },
  {
    display: 'Senegal',
    value: 'SN',
  },
  {
    display: 'Somalia',
    value: 'SO',
  },
  {
    display: 'Suriname',
    value: 'SR',
  },
  {
    display: 'South Sudan',
    value: 'SS',
  },
  {
    display: 'São Tomé & Príncipe',
    value: 'ST',
  },
  {
    display: 'El Salvador',
    value: 'SV',
  },
  {
    display: 'Sint Maarten',
    value: 'SX',
  },
  {
    display: 'Syria',
    value: 'SY',
  },
  {
    display: 'Eswatini',
    value: 'SZ',
  },
  {
    display: 'Tristan da Cunha',
    value: 'TA',
  },
  {
    display: 'Turks & Caicos Islands',
    value: 'TC',
  },
  {
    display: 'Chad',
    value: 'TD',
  },
  {
    display: 'French Southern Territories',
    value: 'TF',
  },
  {
    display: 'Togo',
    value: 'TG',
  },
  {
    display: 'Thailand',
    value: 'TH',
  },
  {
    display: 'Tajikistan',
    value: 'TJ',
  },
  {
    display: 'Tokelau',
    value: 'TK',
  },
  {
    display: 'Timor-Leste',
    value: 'TL',
  },
  {
    display: 'Turkmenistan',
    value: 'TM',
  },
  {
    display: 'Tunisia',
    value: 'TN',
  },
  {
    display: 'Tonga',
    value: 'TO',
  },
  {
    display: 'Türkiye',
    value: 'TR',
  },
  {
    display: 'Trinidad & Tobago',
    value: 'TT',
  },
  {
    display: 'Tuvalu',
    value: 'TV',
  },
  {
    display: 'Taiwan',
    value: 'TW',
  },
  {
    display: 'Tanzania',
    value: 'TZ',
  },
  {
    display: 'Ukraine',
    value: 'UA',
  },
  {
    display: 'Uganda',
    value: 'UG',
  },
  {
    display: 'U.S. Outlying Islands',
    value: 'UM',
  },
  {
    display: 'United States',
    value: 'US',
  },
  {
    display: 'Uruguay',
    value: 'UY',
  },
  {
    display: 'Uzbekistan',
    value: 'UZ',
  },
  {
    display: 'Vatican City',
    value: 'VA',
  },
  {
    display: 'St. Vincent & Grenadines',
    value: 'VC',
  },
  {
    display: 'Venezuela',
    value: 'VE',
  },
  {
    display: 'British Virgin Islands',
    value: 'VG',
  },
  {
    display: 'Vietnam',
    value: 'VN',
  },
  {
    display: 'Vanuatu',
    value: 'VU',
  },
  {
    display: 'Wallis & Futuna',
    value: 'WF',
  },
  {
    display: 'Samoa',
    value: 'WS',
  },
  {
    display: 'Kosovo',
    value: 'XK',
  },
  {
    display: 'Yemen',
    value: 'YE',
  },
  {
    display: 'Mayotte',
    value: 'YT',
  },
  {
    display: 'South Africa',
    value: 'ZA',
  },
  {
    display: 'Zambia',
    value: 'ZM',
  },
  {
    display: 'Zimbabwe',
    value: 'ZW',
  },
  {
    display: 'Unknown Region',
    value: 'ZZ',
  },
];
