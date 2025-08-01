document.addEventListener('DOMContentLoaded', function() {
  const textoConexion = document.getElementById('textoConexion');
  const userId = document.getElementById('user_id').value;
  const csrfToken = document.getElementById('csrf_token').value;

  // Renderizar el botón de PayPal
  paypal.Buttons({
    style: {
      layout: 'vertical',  // o 'horizontal'
      color:  'gold',      // 'gold', 'blue', 'silver'
      shape:  'pill',      // 'pill', 'rect'
      label:  'connect'    // 'connect', 'pay', 'subscribe'
    },
    createOrder: function(data, actions) {
      // Crear una orden de pago simbólica (sin cargo)
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: '0.01',  // Monto mínimo para verificación
            currency_code: 'USD'
          },
          description: "Conexión de cuenta a tu aplicación"
        }]
      });
    },
    onApprove: function(data, actions) {
      // Capturar los detalles de la transacción
      return actions.order.capture().then(function(details) {
        // Mostrar confirmación
        textoConexion.textContent = `Conectado con PayPal: ${details.payer.email_address}`;
        
        // Enviar datos al backend (AJAX)
        fetch('/api/connect-paypal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            user_id: userId,
            paypal_email: details.payer.email_address,
            paypal_user_id: details.payer.payer_id,
            order_id: data.orderID
          })
        })
        .then(response => response.json())
        .then(data => console.log("Éxito:", data))
        .catch(error => console.error("Error:", error));
      });
    },
    onError: function(err) {
      console.error("Error en PayPal:", err);
      textoConexion.textContent = "Error al conectar con PayPal. Intenta nuevamente.";
    }
  }).render('#paypal-button-container');  // Renderiza el botón en este contenedor
});