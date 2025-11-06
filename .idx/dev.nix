{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20,
    # Se agrega firebase-tools para poder usar los emuladores de Firebase.
    pkgs.firebase-tools
  ];

  idx = {
    extensions = [
      "vscodevim.vim",
      "dbaeumer.vscode-eslint"
    ];

    workspace = {
      # Ejecuta este comando la primera vez que se crea el espacio de trabajo.
      onCreate = {
        # Instala las dependencias tanto para el backend (functions) como para el frontend (webapp).
        install-deps = "cd functions && npm install && cd ../webapp && npm install";
      };

      # Ejecuta estos comandos cada vez que el espacio de trabajo se inicia.
      onStart = {
        # Inicia el servidor de desarrollo de Vite para el frontend.
        dev-server = "cd webapp && npm run dev";
        # Inicia los emuladores, ejecuta el script de prueba y luego los apaga.
        # Esto verifica que el backend funciona como se espera.
        verify-backend = "firebase emulators:exec \"node test-function.js\"";
      };
    };

    previews = {
      enable = true,
      previews = {
        # Configura la vista previa para la aplicación web de React.
        web = {
          command = ["cd", "webapp", "&&", "npm", "run", "dev", "--", "--port", "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
