var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        M3U8Parser = require('m3u8-parser'),
        readline = require('readline'),
        fs = require('fs'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
        Channel  = __db_model.Channel,
        Category  = __db_model.Category,
        User  = __db_model.User,
	exec = require('child_process').exec;

router.use(bodyParser.json());
router.use(fileUpload());



async function insertData() {
  for (const itemData of dataToInsert) {
    try {
      const newItem = await Item.create(itemData);
      console.log(`Inserted: ${JSON.stringify(newItem)}`);
    } catch (error) {
      console.error('Error inserting item:', error);
    }
  }
}

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, 
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function parse_m3u8_file(file_name,user_id,scb,ecb){
    Category.findAll({raw:true}).then(function(all_category){
	var exist_category_arr = []
	all_category.map(function(data){
	   exist_category_arr.push(data.name);
	})
    var category_arr = [];
    const channels = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(file_name),
      output: process.stdout,
      terminal: false
    });

    let currentChannel = {};
    var category;
    rl.on('line', (line) => {
      if (line.startsWith('#EXTINF')) {
        // Extract channel information from #EXTINF line
        const match = line.match(/tvg-chno="([^"]*)" tvg-name="([^"]*)" tvg-logo="([^"]*)" tvg-language="([^"]*)" tvg-type="([^"]*)" group-title="([^"]*)"( catchup="([^"]*)" catchup-source="([^"]*)" catchup-days="([^"]*)")?/);
        if (match) {
          currentChannel = {
            "lcn": match[1],
            "name": match[2],
            "image_url": match[3],
            "language": match[4],
            "genres": match[6],
            "user_id":user_id,
          };
            if(!exist_category_arr.includes(category)){
                category_arr.push({
                        category_id:guid(),
                        name:match[6],
                        type:'Genres'
                },{
                        category_id:guid(),
                        name:match[4],
                        type:'Language'

                })
                exist_category_arr.push(match[6])
                exist_category_arr.push(match[4])
            }
        }
      } else if (line.startsWith('http')) {
        // Extract stream URL
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = {};
      }

    });

    rl.on('close', () => {
      // All data extracted, channels array now contains the information
        Channel.bulkCreate(channels).then(created=> {
            Category.bulkCreate(category_arr,{ignoreDuplicates: true}).then(categoey_created=> {
                        scb(200);
            },err=> {
                ecb(err);
            })
        },err=> {
           ecb(err);
        })
      console.log(channels.length);
    });
    
    })
}
router.get('/:limit/:offset', VerifyToken, (req, res) => {
  var offset=(req.params.offset==0)?0:req.params.offset-1;
  var obj = {}
  var user_list_id = []
User.findAll({raw:true,where:{roles:'RESELLER',type :'Admin Pack'}}).then(function(user_list){
  user_list.map(function(data){
	user_list_id.push(data.user_id)
  })

  if(req.roles == 'RESELLER' && req.user_type == 'Own Pack'){
	obj = {user_id:req.userId};
  }
  if((req.roles == 'ADMIN') || (req.roles == 'SUPER_ADMIN')){
        user_list_id.push(req.userId);
	obj = {user_id:user_list_id};
  }
  Channel.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    where: obj,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});
})

router.get('/', VerifyToken, (req, res) => {
  var user_list_id = []
User.findAll({raw:true,where:{roles:'RESELLER',type :'Admin Pack'}}).then(function(user_list){
  user_list.map(function(data){
        user_list_id.push(data.user_id)
  })
   var obj = {}
  if(req.roles == 'RESELLER' && req.user_type == 'Own Pack'){
        obj = {user_id:req.userId};
  }
  if((req.roles == 'ADMIN') || (req.roles == 'SUPER_ADMIN')){
        user_list_id.push(req.userId);
        obj = {user_id:user_list_id};
  }
  Channel.findAll({
    where: obj,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});
})
router.post('/', VerifyToken,function(req, res){
console.log("re",req.body)
    req.body.lcn = Number(req.body.lcn);
    req.body.user_id = req.userId;
    Channel.create(req.body).then(created=> {
        return res.status(200).send("Channel created successfully")
    },err=> {
console.log("we",err)
        if (err && err.errors[0].message && err.errors[0].message == 'name must be unique') {
            return res.status(500).send( "Name already exists" );
        }else{
            console.log(err)
            return res.status(500).send("There was a problem in Channel creation")
        }
    })
});

router.post('/bulk', VerifyToken,function(req, res){
    console.log("req.body",req.body, req.files)
    //write the data (req.fiels) to any path and give the file name to the function
    //do the Reseller Filter option on Chanell creation
console.log("req",req.files)
 console.log("path",__root+'/'+req.files.importData.name)
    exec('rm -rf '+__root+'/'+req.files.importData.name,function (err,stdout,stderr){

    fs.writeFile(__root+'/'+req.files.importData.name,req.files.importData.data,'binary', function(err){
 console.log("err",err)
	   if(!err){
console.log("inside parse ")
	    parse_m3u8_file(__root+'/'+req.files.importData.name,req.userId, scb,ecb)
    function scb(){
console.log("in success call")
        return res.status(200).send("Channel created successfully")
    }
    function ecb(data){
console.log("in err call", data)
        return res.status(500).send("There was a problem in Channel creation")
    }

	  }
    })
   })
    // return
    // Channel.findAll({raw:true,attributes:['name']}).then(function (checkChannel) {
    //     var dupeArr = [];
    //     req.body.map(function (input) {
    //       if (checkChannel.some(function (item) { return ((item.name == input.name) || (item.lcn == input.lcn) ) })) {
    //         dupeArr.push(input.name)
    //       }
    //     });
    //     if (dupeArr.length > 0) {
    //       res.status(500).send("Duplicate entries "+ dupeArr.toString());
    //     }else{
    //         Channel.bulkCreate(req.body).then(created=> {
    //             return res.status(200).send("Channel created successfully")
    //         },err=> {
    //             if (err && err.errors[0].message && err.errors[0].message == 'name must be unique') {
    //                 return res.status(500).send( "Name already exists" );
    //             }else{
    //                 console.log(err)
    //                 return res.status(500).send("There was a problem in Channel creation")
    //             }
    //         })
    //     }
    // })
});


router.put('/:channel_id', VerifyToken,(req,res)=> {
console.log(req.body)

    Channel.update(req.body,{ where:{channel_id:req.params.channel_id} }).then(Channel_updated=> {
        return res.status(200).send("Channel updated successfully")
    },err=> {
        if(err && err.errors[0].message && err.errors[0].message == 'order must be unique') return res.status(500).send("Order already exists")
        return res.status(500).send("There was a problem in Channel updation")
    })
});

router.delete('/:channel_id', VerifyToken, (req,res)=> {
    Channel.destroy({ where: {channel_id: req.params.channel_id}}).then(Channel_deleted=> {
            return res.status(200).send("Channel deleted successfully")
    },err=> {
            return res.status(500).send("There was a problem in Channel deletion")
    })
});


router.post('/deleteBulk', VerifyToken, (req,res)=> {
    Channel.destroy({ where: {channel_id: req.body.channel_id}}).then(Channel_deleted=> {
            return res.status(200).send("Channel deleted successfully")
    },err=> {
        console.log("err",err)
            return res.status(500).send("There was a problem in Channel deletion")
    })
});

module.exports=router;
