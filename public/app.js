document.addEventListener('DOMContentLoaded', () => {
  const getIssuers = firebase.functions().httpsCallable('getNicaraguaIssuers');
  const issuerList = document.getElementById('issuer-list');

  getIssuers()
    .then((result) => {
      const { issuers } = result.data;
      if (issuers && issuers.length > 0) {
        issuers.forEach((issuer) => {
          const li = document.createElement('li');
          li.textContent = issuer.name;
          issuerList.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.textContent = 'No se encontraron emisores.';
        issuerList.appendChild(li);
      }
    })
    .catch((error) => {
      console.error("Error al obtener los emisores:", error);
      const li = document.createElement('li');
      li.textContent = 'Error al cargar los emisores. Revise la consola para más detalles.';
      issuerList.appendChild(li);
    });
});