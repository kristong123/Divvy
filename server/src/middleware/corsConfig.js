const cors = require("cors");
const corsOptions = require("../config/corsOptions");

const corsConfig = cors(corsOptions);

module.exports = corsConfig;