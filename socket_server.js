var Socketio ={};
var MAP      ={};
const http         = require('http').createServer();
const io_server            = require('socket.io')(http);
const editJsonFile    = require("edit-json-file");
const channel_config  = editJsonFile('./channel.json');
const channels =  channel_config.get("iptv");
const socket_port   = "8008";
exec = require('child_process').exec;
global.__root     = __dirname + '/';
global.__core   ='../gn_core_module/src/';
global.__db_model =require(__core+'db/model');
Inventory  = __db_model.Inventory;
PackageChannels=__db_model.PackageChannels;
Channel=__db_model.Channel;
InventoryPackage = __db_model.InventoryPackage;
Appupdate = __db_model.Appupdate;
Webseries  = __db_model.Webseries;
WebEpisodes  = __db_model.WebEpisodes;
var User=__db_model.User; 
var Advertisement=__db_model.Advertisement;

http.listen(socket_port, () => console.log(`server listening on port: ${socket_port}`));
OwnOTT =__db_model.OTT;
Socketio.send_dpo = (message) => {
   message.uid="1234"
  var payload_to_send={
    response_code:'ENTITY',
    response:{
        entity_name:"DPO",
        action:'FORWARD',
        type:'INSERT',
        payload:message
      }
  }
  var data={
      payload:payload_to_send
  }
  for (const serial_number in MAP) {
    io_server.to(MAP[serial_number]).emit("DPO_LOGO",data)
  }
}
Socketio.send_add_update = () => {
   Advertisement.findAll({}).then((response) => {
    console.log("Advertisement RESPONSE...", response, response.length);
    if (response.length > 0) {
      var ota_obj = {
        "uid":response[0].adv_id,
        "title":response[0].title,
        "frequency":response[0].frequency,
        "bottom_image":response[0].bottom_image,
        "left_image":response[0].left_image,
        "slot":response[0].slot
      }
      console.log("....",response[0].slot);
      var payload_to_send = {
        response_code: 'ENTITY',
        response: {
          entity_name: "OTT",
          action: 'FORWARD',
          type: 'CATALOG',
          payload: ota_obj
        }
      }
      var data = {
        payload: payload_to_send
      }

      // Iterate through all connected clients and emit the "APP_UPDATE" event
      for (const serial_number in MAP) {
        io_server.to(MAP[serial_number]).emit("ADD_UPDATE", data);
      }
    }
  });
}
Socketio.send_app_update = () => {
  Appupdate.findAll({}).then((response) => {
    console.log("APP RESPONSE...", response, response.length);
    if (response.length > 0) {
      var ota_obj = {
        "version": response[0].version,
        "url": response[0].apk
      }
      var payload_to_send = {
        response_code: 'ENTITY',
        response: {
          entity_name: "OTT",
          action: 'FORWARD',
          type: 'CATALOG',
          payload: ota_obj
        }
      }
      var data = {
        payload: payload_to_send
      }

      // Iterate through all connected clients and emit the "APP_UPDATE" event
      for (const serial_number in MAP) {
        io_server.to(MAP[serial_number]).emit("APP_UPDATE", data);
      }
    }
  });
}
Socketio.activate_subscription = (message) => {
  var serial_number=message.mac
  Inventory.findOne({
      where:{mac:serial_number},
      include:[{model:InventoryPackage}]
    }).then((response) => {
        console.log("Mac...",response)
        if(response){
          var subscriber_name=response.subscriber_name
          const targetDate = new Date(response.expiry_date);
          const currentDate = new Date();
          if(currentDate < targetDate && response.status=="Active"&& response.inventory_packages.length > 0 ){
          var inv_pack = response.inventory_packages;
          var pack_id = []
          inv_pack.map(function(val){
            pack_id.push(val.package_id)
          })
        OwnOTT.findAll({raw:true}).then(function(ottlist){
            var all_otts = []
            ottlist.map(function(input){
              var ott_obj = {
                "uid": input.ott_id,
                "genre": input.genre,
                "title": input.title,
                "horizontal_url": input.horizontal_url,
                "vertical_url": input.vertical_url,
                "media_url": input.media_url,
		"description":input.description
              }
              all_otts.push(ott_obj);
            })
            var payload_to_send={
                  response_code:'ENTITY',
                  response:{
                      entity_name:"OTT",
                      action:'FORWARD',
                      to:[serial_number],
                      type:'CATALOG',
                      payload:all_otts
                    }
                  }
                var data={
                    serial_number:serial_number,
                    payload:payload_to_send
                }
            io_server.to(MAP[serial_number]).emit("STB_OTT",data)
          })

          Appupdate.findAll({
          }).then((response) => {
	  console.log("APP RESPONSE...",response,response.length)
    	   if(response.length > 0){
    	   	 var ota_obj={
    			"version":response[0].version,
    			"url":response[0].apk
    		}
		var payload_to_send={
                  response_code:'ENTITY',
                  response:{
                      entity_name:"OTT",
                      action:'FORWARD',
                      to:[serial_number],
                      type:'CATALOG',
                      payload:ota_obj
                    }
                  }
                var data={
                    serial_number:serial_number,
                    payload:payload_to_send
                }
            io_server.to(MAP[serial_number]).emit("APP_UPDATE",data)
    	   }
         })
Advertisement.findAll({}).then((response) => {
        console.log("Advertisement RESPONSE...", response, response.length);
        if (response.length > 0) {
          var ota_obj = {
            "uid":response[0].adv_id,
            "title":response[0].title,
            "frequency":response[0].frequency,
            "bottom_image":response[0].bottom_image,
            "left_image":response[0].left_image,
            "slot":response[0].slot
          }
          console.log("slot..",response[0].slot)
          var payload_to_send = {
            response_code: 'ENTITY',
            response: {
              entity_name: "OTT",
              action: 'FORWARD',
              type: 'CATALOG',
              payload: ota_obj
            }
          }
          var data = {
            payload: payload_to_send
          }

          // Iterate through all connected clients and emit the "APP_UPDATE" event
            io_server.to(MAP[serial_number]).emit("ADD_UPDATE", data);
        }
      });

	Webseries.findAll({
            attributes:[['web_id','uid'], 'title', 'horizontal_image', 'vertical_image', 'language', 'genre', 'description'],
            include:[{model : WebEpisodes,as: 'epsiodes', attributes:[ 'season_name', 'episode_title', 'season_number', 'episode_number', 'image', 'media_url']}],
            order: [['createdAt', 'DESC']]
          }).then((all_shows) => {
            var payload_to_send={
                  response_code:'ENTITY',
                  response:{
                      entity_name:"OTT",
                      action:'FORWARD',
                      to:[serial_number],
                      type:'CATALOG',
                      payload:all_shows
                    }
                  }
                var data={
                    serial_number:serial_number,
                    payload:payload_to_send
                }
            io_server.to(MAP[serial_number]).emit("STB_SHOW",data)
          });

          PackageChannels.findAll({raw:true,where:{package_id:pack_id}}).then(function(packchannel){
            var all_channels = [], channel_id_list = [];
            packchannel.map(function(out){
              channel_id_list.push(out.channel_id)
            })
            Channel.findAll({raw:true,where:{channel_id:channel_id_list}}).then(function(channellist){
            channellist.map(function(input){
//              console.log("INPUt...",input)
              var channel_obj = {
                "uid": input.channel_id,
                      "channel_cost": 0,
		"license_url":input.license_url,
                      "channel_id": input.channel_id,
                      "channel_logo": input.image_url,
                      "language": input.language,
                        "channel_type": "FTA",
                      "channel_name": input.name,
                      "genres": input.genres,
                      "lcn": input.lcn,
                      "encrypted_content_id": "",
                      "media_url": input.url,
                      "iptv": "true",
		      "description":input.description
              }
              all_channels.push(channel_obj);
            })
            var payload_to_send={
                  response_code:'ENTITY',
                  response:{
                      entity_name:"IPTV",
                      action:'FORWARD',
                      to:[serial_number],
                      type:'CATALOG',
                      payload:all_channels
                    }
                  }
                var data={
                    serial_number:serial_number,
                    payload:payload_to_send
                }
            io_server.to(MAP[serial_number]).emit("STB_NOTIFICATION",data)
                var stb_subscription_payload={
                serial_number:serial_number,
                status:"Active",
                subscriber_name:subscriber_name
              }
              var stb_payload_to_send={
                response_code:'ENTITY',
                response:{
                  entity_name:"STB_STATUS",
                  action:'FORWARD',
                  to:[serial_number],
                  type:'INSERT',
                  payload:stb_subscription_payload
                }
              }
             var stb_data={
                serial_number:serial_number,
                payload:stb_payload_to_send
             }
       io_server.to(MAP[serial_number]).emit("NOTIFICATION",stb_data);
            });
          })
        }
      }
  });
}

io_server.on("connection", (socket) => {
  var serial_number = socket.handshake.query.mac;
  var partner_code = socket.handshake.query.code; 
// if(mac!="3698"){
  console.log("Enter to socket...",serial_number)
    //Find Mac in dB and send the status
    MAP[socket.handshake.query.mac]=socket.id
    Inventory.findOne({
      where:{mac:serial_number},
      include:[{model:InventoryPackage}]
    }).then((response) => {
  //      console.log("Mac...",response)
        if(response){
    if(response.status=="Active"&& response.inventory_packages.length > 0 ){
    var inv_pack = response.inventory_packages;
    var pack_id = []
    inv_pack.map(function(val){
      pack_id.push(val.package_id)
    })
        OwnOTT.findAll({raw:true}).then(function(ottlist){
            var all_otts = []
            ottlist.map(function(input){
              var ott_obj = {
                "uid": input.ott_id,
                "genre": input.genre,
                "title": input.title,
                "horizontal_url": input.horizontal_url,
                "vertical_url": input.vertical_url,
                "media_url": input.media_url,
		"description":input.description
              }
              all_otts.push(ott_obj);
            })
            var payload_to_send={
                  response_code:'ENTITY',
                  response:{
                      entity_name:"OTT",
                      action:'FORWARD',
                      to:[serial_number],
                      type:'CATALOG',
                      payload:all_otts
                    }
                  }
                var data={
                    serial_number:serial_number,
                    payload:payload_to_send
                }
            io_server.to(MAP[serial_number]).emit("STB_OTT",data)
          })

    Advertisement.findAll({}).then((response) => {
        console.log("Advertisement RESPONSE...", response, response.length);
        if (response.length > 0) {
          var ota_obj = {
            "uid":response[0].adv_id,
            "title":response[0].title,
            "frequency":response[0].frequency,
            "bottom_image":response[0].bottom_image,
            "left_image":response[0].left_image,
            "slot":response[0].slot
          }
	  console.log("slot..",response[0].slot)
          var payload_to_send = {
            response_code: 'ENTITY',
            response: {
              entity_name: "OTT",
              action: 'FORWARD',
              type: 'CATALOG',
              payload: ota_obj
            }
          }
          var data = {
            payload: payload_to_send
          }

          // Iterate through all connected clients and emit the "APP_UPDATE" event
          for (const serial_number in MAP) {
            io_server.to(MAP[serial_number]).emit("ADD_UPDATE", data);
          }
        }
      });
	   Webseries.findAll({
	    attributes:[['web_id','uid'], 'title', 'horizontal_image', 'vertical_image', 'language', 'genre', 'description'],
	    include:[{model : WebEpisodes, attributes:['season_name', 'episode_title', 'season_number', 'episode_number', 'image', 'media_url']}],
	    order: [['createdAt', 'DESC']]
	  }).then((all_shows) => {
	    var payload_to_send={
                  response_code:'ENTITY',
                  response:{
                      entity_name:"OTT",
                      action:'FORWARD',
                      to:[serial_number],
                      type:'CATALOG',
                      payload:all_shows
                    }
                  }
                var data={
                    serial_number:serial_number,
                    payload:payload_to_send
                }
            io_server.to(MAP[serial_number]).emit("STB_SHOW",data)
	  });

	Appupdate.findAll({
          }).then((response) => {
          console.log("APP RESPONSE...",response,response.length)
           if(response.length > 0){
                 var ota_obj={
                        "version":response[0].version,
                        "url":response[0].apk
                }
                var payload_to_send={
                  response_code:'ENTITY',
                  response:{
                      entity_name:"OTT",
                      action:'FORWARD',
                      to:[serial_number],
                      type:'CATALOG',
                      payload:ota_obj
                    }
                  }
                var data={
                    serial_number:serial_number,
                    payload:payload_to_send
                }
            io_server.to(MAP[serial_number]).emit("APP_UPDATE",data)
           }
         })

   PackageChannels.findAll({raw:true,where:{package_id:pack_id}}).then(function(packchannel){
      var all_channels = [], channel_id_list = [];
      packchannel.map(function(out){
        channel_id_list.push(out.channel_id)
      })
      Channel.findAll({raw:true,where:{channel_id:channel_id_list}}).then(function(channellist){
      channellist.map(function(input){
//        console.log("INPUt...",input)
        var channel_obj = {
          "uid": input.channel_id,
                "channel_cost": 0,
                "channel_id": input.channel_id,
                "channel_logo": input.image_url,
                "language": input.language,
                  "channel_type": "FTA",
                "channel_name": input.name,
                "genres": input.genres,
                "lcn": input.lcn,
	       "license_url":input.license_url,
                "encrypted_content_id": "",
                "media_url": input.url,
                "iptv": "true",
		"description":input.description
        }
        all_channels.push(channel_obj);
        })
      var payload_to_send={
            response_code:'ENTITY',
            response:{
                entity_name:"IPTV",
                action:'FORWARD',
                to:[serial_number],
                type:'CATALOG',
                payload:all_channels
              }
            }
          var data={
              serial_number:serial_number,
              payload:payload_to_send
          }
      socket.emit("STB_NOTIFICATION",data);
      });
/*      if(all_channels.length==0){
        var subscription_payload={
                serial_number:serial_number,
                status:"Fresh"
              }
              var payload_to_send={
                response_code:'ENTITY',
                response:{
                  entity_name:"STB_STATUS",
                  action:'FORWARD',
                  to:[serial_number],
                  type:'INSERT',
                  payload:subscription_payload
                }
              }
             var data={
                serial_number:serial_number,
                payload:payload_to_send
             }
       socket.emit("NOTIFICATION",data)
      }*/
      console.log(" all_channels", all_channels)
      })
    }
          console.log("Inventory Data...")
        var status;
        var subscriber_name=response.subscriber_name
        if(response.status=="Active"){
                status="Active"
        }else{
                status="Fresh"
        }
     var subscription_payload={
                serial_number:serial_number,
                status:status,
                subscriber_name: subscriber_name ? subscriber_name : 'New'
              }
                if (!subscription_payload.serial_number) {
                   subscription_payload.subscriber_name = 'New';
                }
              var payload_to_send={
                response_code:'ENTITY',
                response:{
                  entity_name:"STB_STATUS",
                  action:'FORWARD',
                  to:[serial_number],
                  type:'INSERT',
                  payload:subscription_payload
                }
              }
             var data={
                serial_number:serial_number,
                payload:payload_to_send
             }
       socket.emit("NOTIFICATION",data);
        }else{
	  if(partner_code == undefined){ 
          Inventory.create({serial_no:serial_number,mac:serial_number,status:"Fresh"})
          var subscription_payload={
              serial_number:serial_number,
              status:"Fresh",
                subscriber_name: subscriber_name ? subscriber_name : 'New'
            }
                 if (!subscription_payload.serial_number) {
                   subscription_payload.subscriber_name = 'New';
                }
            var payload_to_send={
              response_code:'ENTITY',
              response:{
                entity_name:"STB_STATUS",
                action:'FORWARD',
                to:[serial_number],
                type:'INSERT',
                payload:subscription_payload
              }
            }
           var data={
              serial_number:serial_number,
              payload:payload_to_send
           }
           socket.emit("NOTIFICATION",data);
          console.log("No Inventory Data...")
        }else{

	

            User.findOne({raw:true,where:{partner_code:partner_code}}).then(function(find_user){	
console.log("find_user",find_user)
              if(!find_user){
                var subscription_payload={
                    serial_number:serial_number,
                    status:"Wrong",
                    subscriber_name: subscriber_name ? subscriber_name : 'New'
                }
                if (!subscription_payload.serial_number) {
                     subscription_payload.subscriber_name = 'New';
                }

                var payload_to_send={	
                  response_code:'ENTITY',
                  response:{
                    entity_name:"STB_STATUS",



                    action:'FORWARD',

	

                    to:[serial_number],

	

                    type:'INSERT',

	

                    payload:subscription_payload

	

                  }

	

                }

	

                var data={

	

                  serial_number:serial_number,

	

                  payload:payload_to_send

	

                 }

	

                 socket.emit("NOTIFICATION",data);

	

              }else{

	

                  var object = {

	

                    serial_no:serial_number,

	

                    mac:serial_number,

	

                    status:"Fresh"

	

                  }

	

                  if(find_user){

	

                    object['reseller_id']  = find_user.user_id

	

                    object['reseller_name']  = find_user.username

	

                  }

	

console.log("object",object)

	

                Inventory.create(object)

	

                var subscription_payload={

	

                    serial_number:serial_number,

	

                    status:"Fresh",

	

                      subscriber_name: subscriber_name ? subscriber_name : 'New'

	

                }

	

                if (!subscription_payload.serial_number) {

	

                     subscription_payload.subscriber_name = 'New';

	

                }

	

                var payload_to_send={

	

                  response_code:'ENTITY',

	

                  response:{

	

                    entity_name:"STB_STATUS",

	

                    action:'FORWARD',

	

                    to:[serial_number],

	

                    type:'INSERT',

	

                    payload:subscription_payload

	

                  }

	

                }

	

                var data={

	

                  serial_number:serial_number,

	

                  payload:payload_to_send

	

                }

	

                socket.emit("NOTIFICATION",data);

	

                console.log("No Inventory Data...")

	

              }

	

            })

	

          } 
	 }
     });
  //}else{
/*   socket.on('MAC_REGISTER',(message)=>{
        console.log("MAC_REGISTER",message)
        //exec("service nginx stop")
        // store Mac in DB
     });*/
   // }
})
module.exports = Socketio;
