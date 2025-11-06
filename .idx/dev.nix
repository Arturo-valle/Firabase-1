{ pkgs, ... }: {
  # El canal de nixpkgs define qué versiones de paquetes están disponibles.
  # "stable-24.05" ofrece paquetes probados y estables.
  channel = "stable-24.05";

  # Lista de paquetes a instalar desde el canal especificado.
  packages = [
    # Requerimos Node.js para desarrollar y desplegar las Cloud Functions.
    pkgs.nodejs_20
    # Puppeteer para controlar un navegador headless.
    pkgs.puppeteer
    # Chromium es el navegador que Puppeteer controlará.
    pkgs.chromium
  ];

  # Configuraciones específicas del IDE de Firebase Studio.
  idx = {
    # Lista de extensiones de VS Code para instalar.
    extensions = [
      # Herramientas esenciales para el desarrollo en Firebase.
      "firebase.firebase-vscode"
    ];
  };
}
