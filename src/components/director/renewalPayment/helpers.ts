import { Theme } from '../../../theme/tokens';

export function fmtDate(iso?: string | null): string {
  if (!iso) { return '—'; }
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatStatus(status?: string): string {
  if (!status) { return 'Unknown'; }
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getCheckoutHtml(data: {
  key: string;
  amount: number;
  orderId: string;
  subscriptionId: string;
  description: string;
  email: string;
} | null): string {
  if (!data) { return ''; }
  const primaryColor = Theme.colors.primary;
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .loader {
              border: 4px solid #e2e8f0;
              border-top: 4px solid ${primaryColor};
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        </head>
        <body>
          <div class="loader"></div>
          <script>
            window.onload = function() {
              try {
                var options = {
                  "key": "${data.key}",
                  "amount": ${data.amount},
                  "currency": "INR",
                  "name": "AttendX",
                  "description": "${data.description}",
                  "prefill": {
                    "email": "${data.email}"
                  },
                  "theme": {
                    "color": "${primaryColor}"
                  },
                  "handler": function (response) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      event: 'success',
                      data: response
                    }));
                  },
                  "modal": {
                    "ondismiss": function() {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        event: 'dismiss'
                      }));
                    }
                  }
                };
                if ("${data.orderId}") {
                  options.order_id = "${data.orderId}";
                }
                if ("${data.subscriptionId}") {
                  options.subscription_id = "${data.subscriptionId}";
                  delete options.order_id;
                  delete options.amount;
                }
                var rzp = new Razorpay(options);
                rzp.on('payment.failed', function (response) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    event: 'fail',
                    data: response.error
                  }));
                });
                rzp.open();
              } catch (err) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  event: 'fail',
                  data: { description: err.message }
                }));
              }
            };
          </script>
        </body>
      </html>
    `;
}
