const app = require("./src/app");
const config = require("./src/config/env");

app.listen(config.port, () => {
  console.log(`UserAlfresco API running at http://localhost:${config.port}`);
  console.log(`Alfresco server: ${config.alfrescoHost}`);
});

