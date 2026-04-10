const axios = require('axios');
axios.post('https://api.alcambio.app/graphql', {
  query: `
    query getCountryConversions($countryCode: String!) {
      getCountryConversions(payload: { countryCode: $countryCode }) {
        conversionRates {
          baseValue
          official
          rateCurrency {
            code
            symbol
          }
          type
        }
      }
    }
  `,
  variables: { countryCode: 'VE' },
  operationName: 'getCountryConversions'
}, {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://alcambio.app',
    'Referer': 'https://alcambio.app/'
  }
}).then(res => console.log(JSON.stringify(res.data, null, 2))).catch(err => console.error(err.message));
