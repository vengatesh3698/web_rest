var express     = require('express'),
        router          = express.Router(),
        bodyParser      = require('body-parser'),
        fileUpload      = require('express-fileupload'),
        VerifyToken = require(__root +__core+'modules/VerifyToken'),
        Category  = __db_model.Category;

router.use(bodyParser.json());
router.use(fileUpload());

router.get('/:limit/:offset', VerifyToken, (req, res) => {
  var offset=(req.params.offset==0)?0:req.params.offset-1;
  Category.findAndCountAll({
    limit: req.params.limit,
    offset: offset,
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});

router.get('/', VerifyToken, (req, res) => {
  Category.findAll({
    order: [['createdAt', 'DESC']]
  }).then((response) => {
    res.status(200).send(response);
  });
});

router.post('/', VerifyToken,function(req, res){
    Category.create(req.body).then(created=> {
        return res.status(200).send("Category created successfully")
    },err=> {
        if (err && err.errors[0].message && err.errors[0].message == 'name must be unique') {
            return res.status(500).send( "Name already exists" );
        }else{
            return res.status(500).send("There was a problem in Category creation")
        }
    })
});

router.put('/:category_id', VerifyToken,(req,res)=> {
    Category.update(req.body,{ where:{category_id:req.params.category_id} }).then(Category_updated=> {
        return res.status(200).send("Category updated successfully")
    },err=> {
        if(err && err.errors[0].message && err.errors[0].message == 'order must be unique') return res.status(500).send("Order already exists")
        return res.status(500).send("There was a problem in Category updation")
    })
});

router.delete('/:category_id', VerifyToken, (req,res)=> {
    Category.destroy({ where: {category_id: req.params.category_id}}).then(Category_deleted=> {
            return res.status(200).send("Category deleted successfully")
    },err=> {
            return res.status(500).send("There was a problem in Category deletion")
    })
});

module.exports=router;
