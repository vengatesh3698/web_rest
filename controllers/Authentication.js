var express       = require('express'),
    router        = express.Router(),
    bodyParser    = require('body-parser'),
    jwt           = require('jsonwebtoken'),
    bcrypt        = require('bcryptjs'),
    conf          = require(__root +"config.json"),
    User          = __db_model.User;

router.use(bodyParser.json());

router.post('/login',(req,res)=>{
	User.findOne({ raw: true, where: { username: req.body.email } })
  	.then(user => {
            if (!user) {
      		return res.status(500).send({ auth: false, msg: 'No user found!' });
    	    }
             if(user && !user.status){return res.status(500).send({ auth: false, msg: 'User is in deactivate status' });}
    	    const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
    	    if (!passwordIsValid) {
      	         return res.status(500).send({ auth: false, msg: 'Invalid credentials' });
    	    }
    	    const token = jwt.sign({ id: user.user_id, org_id: user.org_id, user_status: 1}, conf.secret_key, { expiresIn: conf.session_expiry * 60 });
    	      delete user.password;
    	      res.status(200).send({
      	          auth: true,
      		  token: token,
      		  user: user,
      		  session: conf.session_expiry - 1
    	      });
  	},error => {
console.log("eer",error)
    	res.status(500).send({ msg: 'Internal server error' });
  	});
});

router.get('/',(req,res)=>{
	User.count({raw:true}).then(count=>{
		res.status(200).send({user_count:(count==0)?0:1});
	},err=>{res.status(500).send("There was a problem to find user")});
});

module.exports=router;
