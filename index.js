const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const { name } = require('ejs');

const app = express();
const PORT = 3000;



const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Foodie_hub',
    password: 'postgres',
    port: 5432
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// HOME
app.get('/', (req, res) => {
    res.render('index');
});

//checking database is connected
pool.query('select NOW()',(err,res)=>{
    if(err){
        console.error('Database connection error',err.stack);
    }else{
        console.log('Database is connected');
    }
});

// View + search restaurants

// app.get('/restaurants', (req, res) => {
//   const search = req.query.search || '';
//   let query, values;

//   if (search) {
//     query = "SELECT * FROM restaurant WHERE name ILIKE $1 OR address ILIKE $1";
//     values = [`%${search}%`];
//   } else {
//     query = "SELECT * FROM restaurant ORDER BY id";
//     values = [];
//   }

//   pool.query(query, values)
//     .then(result => {
//       res.render('restaurants', { restaurants: result.rows, search });
//     })
//     .catch(err => {
//       console.error(err);
//       res.status(500).send('Server error');
//     });
// });


app.get('/restaurants',(req,res)=>{
   const search = req.query.search || '';

  if (search){
    pool.query('SELECT * FROM restaurant WHERE name ILIKE $1 OR address ILIKE $1', [`%${search}%`]).then (result=>
      res.render('restaurants', { restaurants: result.rows, search })
    ).catch(err=>res.status(500).send('err'));
  }
  else{
    pool.query('SELECT * FROM restaurant ORDER BY id', []).then (result=>
      res.render('restaurants', { restaurants: result.rows, search })
    ).catch(err=>res.status(500).send('err'));
  }
});

// Add restaurant
// app.post('/restaurants',  (req, res) => {
//   const { name, address, phone } = req.body;
 
//      pool.query(
//       'INSERT INTO restaurant (name, address, phone) VALUES ($1, $2, $3)',
//       [name, address, phone]
//     ).then(() => {
//     res.redirect(`/restaurants`);
//   })
//   .catch(err => {
//     res.send('Error ' + err.message);
//   });
// });
app.post('/restaurants',(req,res)=>{
  const {name , address, phone}= req.body;
  pool.query('INSERT INTO restaurant (name, address, phone) VALUES ($1, $2, $3)',[name,address,phone])
  .then(res.redirect('/restaurants'))
  .catch(err=> res.send("Error in new resturant",err));
});
// Edit form
// app.get('/restaurants/:id/edit', (req, res) => {
//   pool.query('SELECT * FROM restaurant WHERE id = $1',  [req.params.id] )
//   .then(result => {
//     res.render('edit_restaurant', { restaurant: result.rows[0] });
//   })
//   .catch(err => {
//     res.send('Error ' + err.message);
//   });
// });

app.get('/restaurants/:id/edit',(req,res)=>{
  id= req.params.id;
pool.query('Select * from restaurant where id=$1',[id])
.then(result=>res.render('edit_restaurant',{restaurant:result.rows[0]}))
.catch(err=>{
   res.send('Error ' + err.message);
});

});


// Update restaurant
app.post('/restaurants/:id',  (req, res) => {
  const { name, address, phone } = req.body;
  pool.query(
      'UPDATE restaurant SET name = $1, address = $2, phone = $3 WHERE id = $4',
      [name, address, phone, req.params.id])
    .then(result => {
    res.redirect('/restaurants')
 }).catch(err=>{
 res.send('Error ' + err.message);
 });
});



// Delete restaurant
// app.post('/restaurants/:id/delete', async (req, res) => {
//   try {
//     await pool.query('DELETE FROM restaurant WHERE id = $1', [req.params.id]);
//     res.redirect('/restaurants');
//   } catch (err) {
//     res.send('Error ' + err.message);
//   }
// });

app.post('/restaurants/:id/delete',(req,res)=>{
  pool.query('Delete from restaurant WHERE id = $1',[req.params.id])
  .then(result=>{
    res.redirect('/restaurants');
  })
  .catch(err=>res.status(500).send('error'));
});
// List menu items for a restaurant
app.get('/restaurants/:id/menu', (req, res) => {
  pool.query("SELECT * FROM restaurant WHERE id = $1", [req.params.id])
    .then(restaurantResult => {
      if (restaurantResult.rows.length === 0) 
        return res.status(404).send('Restaurant not found');
      

      pool.query("SELECT * FROM menu WHERE restaurant_id = $1 ORDER BY id", [req.params.id])
        .then(menuResult => {
          res.render('menu', {
            restaurant: restaurantResult.rows[0],
            menuItems: menuResult.rows
          });
        })
        .catch(err => {
          console.error(err);
          res.status(500).send('Error loading menu');
        });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error loading restaurant');
    });
});

// List menu items for a restaurant with 1 query using join
// app.get('/restaurants/:id/menu', (req, res) => {
//   pool.query(`
//     SELECT r.*, m.id AS menu_id, m.name AS menu_name, m.price 
//     FROM restaurant r 
//     JOIN menu m ON r.id = m.restaurant_id 
//     WHERE r.id = $1
//     ORDER BY m.id
//   `, [req.params.id])
//     .then(result => {
//       if (result.rows.length === 0) return res.status(404).send('Restaurant not found');

//       const restaurant = {
//         id: result.rows[0].id,
//         name: result.rows[0].name,
//         address: result.rows[0].address
//       };

//       const menuItems = result.rows.map(row => ({
//         id: row.menu_id,
//         name: row.menu_name,
//         price: row.price
//       }));

//       res.render('menu', { restaurant, menuItems });
//     })
//     .catch(err => {
//       console.error(err);
//       res.status(500).send('Server error');
//     });
// });

// Form to add menu item
app.get('/restaurants/:id/menu/new', (req, res) => {
  res.render('add_menu', { restaurantId: req.params.id });
});

//  add menu item
app.post('/restaurants/:id/menu', (req, res) => {
  const { name, price, avalability } = req.body;
  const isAvailable = avalability === 'on';

  pool.query(
    "INSERT INTO menu (restaurant_id, name, price, avalability) VALUES ($1,$2, $3,$4)",
    [req.params.id, name, price, isAvailable]
  )
  .then(result => {
    res.redirect(`/restaurants/${req.params.id}/menu`);
  })
  .catch(err => {
    console.error(err);
    res.status(500).send('Server error');
  });
});


// Form to edit menu item
// app.get('/menu/:menuId/edit', async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT * FROM menu WHERE id = $1",
//       [req.params.menuId]
//     );
//     res.render('edit_menu', { menuItem: result.rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

app.get('/menu/:menuId/edit',(req,res)=>{
pool.query('Select * from menu where id= $1',[req.params.menuId])
.then(result=>res.render('edit_menu',{menuItem:result.rows[0]}))
.catch(err=>res.status(500).send("Error in form edit"))

});

// Handle edit menu item
// app.post('/menu/:menuId', async (req, res) => {
//   const { name, price, avalability } = req.body;
//   try {
//     const menuItem = await pool.query(
//       "UPDATE menu SET name = $1, price = $2, avalability = $3 WHERE id = $4 RETURNING *",
//       [name, price, avalability === 'on', req.params.menuId]
//     );
//     res.redirect(`/restaurants/${menuItem.rows[0].restaurant_id}/menu`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

app.post('/menu/:menuId',(req,res)=>{
  const {name, price, avalability} = req.body;
pool.query('Update menu set name = $1 , price= $2, avalability= $3 where id=$4 returning *',[name, price, avalability==='on', req.params.menuId])
.then(result=>{ res.redirect(`/restaurants/${result.rows[0].restaurant_id}/menu`)})
.catch(err=> res.status(500).send('Error in Edit'));

});

// Delete menu item
// app.post('/menu/:menuId/delete', async (req, res) => {
//   try {
//     const item = await pool.query("SELECT * FROM menu WHERE id = $1", [req.params.menuId]);
//     await pool.query("DELETE FROM menu WHERE id = $1", [req.params.menuId]);
//     res.redirect(`/restaurants/${item.rows[0].restaurant_id}/menu`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

app.post('/menu/:menuId/delete',(req,res)=>{
 
pool.query('Select * from menu where id = $1',[req.params.menuId])
.then(itemResult=>{
    if(itemResult.rows.length===0){
      return res.status(400).send("Menu Item not found");
    }
    const restaurantId= itemResult.rows[0].restaurant_id;
    pool.query('Delete from menu where id = $1',[req.params.menuId])
    .then(result=>{
      res.redirect(`/restaurants/${restaurantId}/menu`)
    })
    .catch(err=> res.status(500).send("Err"));
  })
.catch(err=> res.status(500).send('Err in deleting'))
});
// Toggle avalability
// app.post('/menu/:menuId/toggle', async (req, res) => {
//   try {
//     const item = await pool.query("SELECT * FROM menu WHERE id = $1", [req.params.menuId]);
//     await pool.query(
//       "UPDATE menu SET avalability = $1 WHERE id = $2",
//       [!item.rows[0].avalability, req.params.menuId]
//     );
//     res.redirect(`/restaurants/${item.rows[0].restaurant_id}/menu`);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });
app.post('/menu/:menuId/toggle',(req,res)=>{
    
  pool.query('Select * from menu where id=$1',[req.params.menuId])
  .then(menuIdResult=>{
    const current = menuIdResult.rows[0].avalability;
    const newValue= !current; 
    pool.query('Update menu set avalability= $1 where id = $2',[newValue,req.params.menuId])
    .then(result=>{
      res.redirect(`/restaurants/${menuIdResult.rows[0].restaurant_id}/menu`)
    })
    .catch(err=>
      res.send("Failed")
    )
  })
  .catch(err=>{
    res.status(500).send("Toggle failed");
  });
});
// View all customers
// app.get('/customers', async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM customer ORDER BY id");
//     res.render('customers', { customers: result.rows });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

app.get('/customers',(req,res)=>{
pool.query('Select * from customer order by id')
.then(result=>{ res.render('customers',{customers:result.rows})})
.catch(err=> res.send("Error in view"))
});
// Form to add customer
app.get('/customers/new', (req, res) => {
  res.render('new_customer');
});

// Handle add customer
// app.post('/customers', async (req, res) => {
//   const { name, phone, email } = req.body;
//   try {
//     await pool.query(
//       "INSERT INTO customer (name, phone, email) VALUES ($1, $2, $3)",
//       [name, phone, email]
//     );
//     res.redirect('/customers');
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

app.post('/customers',(req,res)=>{
  const {name, phone , email}= req.body;

pool.query('insert into customer (name,phone,email) values ($1,$2,$3)', [name,phone,email])
.then(res.redirect('/customers'))
.catch(err=>res.status(500).send("Error in adding new customer"));
})


// Form to edit customer
// app.get('/customers/:id/edit', async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM customer WHERE id = $1", [req.params.id]);
//     res.render('edit_customer', { customer: result.rows[0] }); 
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

app.get('/customers/:id/edit',(req,res)=>{
pool.query('Select * from customer where id=$1', [req.params.id])
.then(result=> res.render('edit_customer',{customer:result.rows[0]}))
.catch(err=>res.send("err in fetching customer"));
});

// Handle update customer
app.post('/customers/:id', async (req, res) => {
  const { name, phone, email } = req.body;
  try {
    await pool.query(
      "UPDATE customer SET name = $1, phone = $2, email = $3 WHERE id = $4",
      [name, phone, email, req.params.id]
    );
    res.redirect('/customers');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Delete customer
app.post('/customers/:id/delete', async (req, res) => {
  try {
    await pool.query("DELETE FROM customer WHERE id = $1", [req.params.id]);
    res.redirect('/customers');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// Show all orders
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
     ` SELECT o.*, c.name as customer_name, r.name as restaurant_name
      FROM orders o
      JOIN customer c ON o.customer_id = c.id
      JOIN restaurant r ON o.restaurant_id = r.id
      ORDER BY o.id ASC`
    );
    res.render('orders', { orders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// New order form
app.get('/orders/new', async (req, res) => {
  const customers = await pool.query('SELECT * FROM customer');
  const restaurants = await pool.query('SELECT * FROM restaurant');
  const menuItems = await pool.query('SELECT * FROM menu WHERE availability = true');
  res.render('new_order', {
    customers: customers.rows,
    restaurants: restaurants.rows,
    menuItems: menuItems.rows
  });
});

// Place order
app.post('/orders', async (req, res) => {
  const { customer_id, restaurant_id } = req.body;
  const menu_ids = Array.isArray(req.body.menu_ids) ? req.body.menu_ids : [req.body.menu_ids];
  
  const order = await pool.query(
    'INSERT INTO orders (customer_id, restaurant_id, status) VALUES ($1, $2, $3) RETURNING *',
    [customer_id, restaurant_id, 'pending']
  );

  for (let menu_id of menu_ids) {
    const quantity = parseInt(req.body[`quantity_${menu_id}`]) || 1;
    await pool.query(
      'INSERT INTO orderitem (order_id, menu_id, quantity) VALUES ($1, $2, $3)',
      [order.rows[0].id, menu_id, quantity]
    );
  }

  res.redirect('/orders');
});

// Update order status
app.post('/orders/:id/status', async (req, res) => {
  await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2',
    [req.body.status, req.params.id]
  );
  res.redirect('/orders');
});

// Delete order
app.post('/orders/:id/delete', async (req, res) => {
  await pool.query('DELETE FROM orderitem WHERE order_id = $1', [req.params.id]);
  await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
  res.redirect('/orders');
});

// View orders by customer
app.get('/customers/:id/orders', async (req, res) => {
  const result = await pool.query(
    `SELECT o.*, r.name as restaurant_name
    FROM orders o
    JOIN restaurant r ON o.restaurant_id = r.id
    WHERE o.customer_id = $1
    ORDER BY o.id DESC`
  , [req.params.id]);
  res.render('orders', { orders: result.rows });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});