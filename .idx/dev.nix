{ pkgs, ... }: {
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
  ];

  idx = {
    extensions = [
      "vscodevim.vim",
      "dbaeumer.vscode-eslint"
    ];

    workspace = {
      # Ejecuta este comando la primera vez que se crea el espacio de trabajo.
      onCreate = {
        # Instala las dependencias del frontend definidas en webapp/package.json
        npm-install = "cd webapp && npm install";
      };

      # Ejecuta este comando cada vez que el espacio de trabajo se inicia.
      onStart = {
        # Inicia el servidor de desarrollo de Vite para el frontend.
        dev-server = "cd webapp && npm run dev";
      };
    };

    previews = {
      enable = true;
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
