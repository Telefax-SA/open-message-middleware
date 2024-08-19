const platformClient = require("purecloud-platform-client-v2");
const config = require('./config.js');
const client = platformClient.ApiClient.instance;
client.setEnvironment(platformClient.PureCloudRegionHosts.sa_east_1); // Genesys Cloud region
var accessToken = null;

// Manually set auth token or use loginImplicitGrant(...) or loginClientCredentialsGrant(...) or loginPKCEGrant(...)
client.loginClientCredentialsGrant(config.clientId,config.clientSecret).then((data)=> {
  // Do authenticated things
  accessToken = data.accessToken;
  client.setAccessToken(accessToken);

  let apiInstance = new platformClient.ConversationsApi();

  fasync();

  // Get message conversation

  async function fasync() {
    let conversationId = ["3043c989-c20c-4276-8d61-b55b52c657c0", "287c294d-8817-4db2-9c62-e346a937b054"]; // String | conversationId
    for(let k = 0; k < 2; k++){
      console.log("CONVERSATION ID: ", conversationId[k])
      
      apiInstance.getConversationsMessage(conversationId[k])
        .then((data) => {
          for(let i = 0; i< data["participants"].length; i++){
            console.log(data["participants"][i].name + " " + data["participants"][i]["messages"].length);
          }
        })
        .catch((err) => {
          console.log("There was a failure calling getConversationsMessage");
          console.error(err);
        });
  
      await new Promise(r => setTimeout(r, 2000));
  } 
  }
});

