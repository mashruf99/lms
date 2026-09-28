export default {
  routes: [
    {
      method: 'POST',
      path: '/payments/register-with-payment',
      handler: 'public-payment.registerWithPayment',
      config: {
        policies: [],
        auth: false, // truly public — no JWT needed
      },
      info: {
        apiName: 'payment',
        type: 'content-api',
      },
    },
  ],
};
