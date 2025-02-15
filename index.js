const dotenv = require("dotenv");
dotenv.config();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  CURSOR_FLAGS,
} = require("mongodb");
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const bcrypt = require("bcrypt");

// ___________step 1___for jwt and cookies storage

var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// ___________step 2___for jwt and cookies storage
app.use(
  cors({
    origin: [
            "http://localhost:4173", 
            "http://localhost:5173",
            "https://be-healthy-by-mostafiz.netlify.app",
          ],

    methods: ["GET", "POST", "PUT", "DELETE"],

    credentials: true,
  })
);

app.use(express.json());

// ___________step 3___for jwt and cookies storage
app.use(cookieParser());

// ________________________middle ware

const logger = async (req, res, next) => {
  console.log("Inside the logger");

  next();
};

// ___________step 5___for jwt and cookies storage

const verifyToken = async (req, res, next) => {
  // console.log("Inside verify token middleware");
  const token = req?.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  // verify the token
  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorized Access" });
    } else {
      // console.log("Okay");
      req.user = decoded;
    }
    next();
  });
};

// Database connection

const uri = process.env.MONGO_URI;

// const uri = "mongodb://localhost:27017"

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });

    // Access the database and collections

    const db = client.db("mobileBank");
    const menuCollection = db.collection("menu");

    const campCollection = db.collection("camp");
    const messageCollection = db.collection("message");
    const replyMessageCollection = db.collection("replyMessage");

    const userCollection = db.collection("users");
    const systemCollection = db.collection("systemCollection");
    const agentRequestsCollection = db.collection("agentRequestsCollection");

   
    const transactionsCollection = db.collection("transactions");
    const joinCampCollection = db.collection("joinCamp");
    const paymentCollection = db.collection("payments");
    const galleryCollection = db.collection("gallery");
    const articleCollection = db.collection("article");


    const reviewCollection = db.collection("reviews");
    const cartCollection = db.collection("carts");

    console.log("Successfully connected to MongoDB!");

    // auth related APIS

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req?.user?.email;
      const user = await userCollection.findOne({ email });
      const isAdmin = user?.accountType === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Access Denied" });
      }
      // console.log("Inside verify Admin");
      next();
    };

    // ___________step 4___for jwt and cookies storage

    app.post("/jwt", async (req, res) => {
      const email = req.body.email;
      const payload = { email }; // Create a payload object
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "5h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          // secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          // secure: process.env.NODE_ENV === "production",
        })
        .send({ success: true });
    });

    // public route
    //menuPage
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find({}).toArray();
      res.send(result);
    });


        // public route
    //menuPage
    app.get("/camp", async (req, res) => {
      const result = await campCollection.find({}).toArray();
      res.send(result);
    });

    //public route
    //testimonialSlider
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });

    //
    //order page route
    //private route


// cross
    app.post("/cart", async (req, res) => {
      try {
        const cartItems = req.body;
        console.log(cartItems);
        const result = await cartCollection.insertOne(cartItems);
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });



    app.post("/post-comment", async (req, res) => {
      try {
        const data = req.body;
        const { articleId, comment, name, email, createdAt } = data;
    
        // console.log(articleId, comment, name, email, createdAt);
    
        // Use articleId to find the existing comment and upsert
        const result = await articleCollection.updateOne(
          { _id: new ObjectId( articleId) }, // Find the article by its ID
          {
            $push: { comments: { comment, name, email, createdAt } }, // Add new comment to the array of comments
          },
          { upsert: true } // This will create a new comment array if not present
        );
    
        res.send({ success: true, message: "Comment added successfully", result });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });



    app.post("/post-love", async (req, res) => {
      try {
        const { articleId, email } = req.body;
        console.log(articleId, email);
    
        // Find the article document by its ID
        const article = await articleCollection.findOne({ _id: new ObjectId(articleId) });
    
        // If the article exists
        if (article) {
          // Initialize loveCount and lovedBy if they don't exist
          const updatedArticle = {
            $inc: { loveCount: 1 }, // Increment loveCount by 1
            $addToSet: { lovedBy: email }, // Ensure email is added uniquely
          };
    
          // If loveCount or lovedBy doesn't exist, set default values
          if (article.loveCount === undefined) {
            updatedArticle.$set = { loveCount: 1 }; // Set loveCount to 1 if it doesn't exist
          }
    
          // Update the article document
          const result = await articleCollection.updateOne(
            { _id: new ObjectId(articleId) }, 
            updatedArticle
          );
    
          res.send({ success: true, message: "Love counted successfully", result });
        } else {
          res.status(404).send({ success: false, message: "Article not found" });
        }
      } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).send({ success: false, message: error.message });
      }
    });
    





    app.post("/join-camp", async (req, res) => {
      try {
        const joinCampData = req.body;
        const { campId } = joinCampData;
    
        // console.log(campId);
    
     
    
        // Update the participant count by incrementing it by one
        const updatedCamp = await campCollection.updateOne(
          { _id: new ObjectId(campId) },
          { $inc: { participantCount: 1 } }
        );
    
        if (updatedCamp.modifiedCount === 0) {
          return res.status(500).send({ success: false, message: "Failed to update participant count." });
        }
    
       
        const result = await joinCampCollection.insertOne(joinCampData);
    
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });
    


    //order page route
    //private route
    // cross
    app.get("/cart/:email", async (req, res) => {
      try {
        const email = req.params.email;
        console.log(email);
        const result = await cartCollection
          .find({ userEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });



    // private route
    app.get("/registered-camps/:email",verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        console.log(email);
        const result = await joinCampCollection.find({ 
          participantEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // private route
    app.get("/join-camps", async (req, res) => {
      try {
       
        // console.log("Hi join-camps")
        const result = await joinCampCollection.find({}).toArray();
        // console.log(result)
        res.send(result);

      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });




    // UserCartHome page
    // private route
    // cross
    app.delete("/cart/:id", async (req, res) => {
      try {
        const id = req.params.id;
        // console.log(id);
        const result = await cartCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // Todos
    // RegisterCamp.jsx
    // private route
    app.post("/deleteFromJoinCamp",verifyToken, async (req, res) => {
      try {

        const data = req.body;
        console.log(data)

        const id = data.id;
        const campId = data.campId
        ;
        console.log(id);
        const result = await joinCampCollection.deleteOne({
          _id: new ObjectId(id),
        });

        const updatedCamp = await campCollection.updateOne(
          { _id: new ObjectId(campId) },
          { $inc: { participantCount: -1 } }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // users related api
    // app.post("/users", async (req, res) => {
    //   try {
    //     const user = req.body;
    //     const email = user?.email;
    //     const existingUser = await userCollection.findOne({ email });

    //     if (existingUser) {
    //       return res.send({ success: false, message: "User already exists" });
    //     }

    //     const result = await userCollection.insertOne(user);
    //     res.send(result);
    //   } catch (error) {
    //     res.status(500).send({ success: false, message: error.message });
    //   }
    // });


    app.post("/users", async (req, res) => {
      try {
        const { name, email, phone, pin, accountType, nid } = req.body;
    
        // Validate required fields
        if (!name || !email || !phone || !pin || !accountType || !nid) {
          return res.status(400).json({ success: false, message: "All fields are required" });
        }
    
        // Check if email, phone, or NID already exists
        const existingUser = await userCollection.findOne({
          $or: [{ email }, { phone }, { nid }],
        });
    
        if (existingUser) {
          return res.status(400).json({ success: false, message: "User with this email, phone, or NID already exists" });
        }
    
        // Hash the PIN before storing
        const hashedPin = await bcrypt.hash(pin, 10);
    
        // Assign initial balance based on account type
        const initialBalance = accountType === "User" ? 40 : 100000;
    
        // Agents should be blocked and unapproved initially
        const isBlocked = accountType === "Agent" ? true : false;
        const isApproved = accountType === "Agent" ? false : true; // Agents require admin approval
    
        // Create user object
        const newUser = {
          name,
          email,
          phone,
          pin: hashedPin, // Store hashed PIN
          accountType,
          nid,
          balance: initialBalance,
          isBlocked,
          isApproved,
          earnings: accountType === "Agent" ? 0 : undefined, // Earnings field only for agents
          transactions: [], // Empty array for transaction history
          deviceToken: null, // Used to allow login from one device only
          createdAt: new Date(),
          updatedAt: new Date(),
        };
    
        // Insert into database
        const result = await userCollection.insertOne(newUser);
    
        res.status(201).json({ success: true, message: "User registered successfully", userId: result.insertedId });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });




    // public route
    app.get("/get-photos", async (req, res) => {
      try {
    
        const result = await galleryCollection.find({ }).toArray();

        res.send(result);
     
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });



    app.post("/update-users", verifyToken, async (req, res) => {
      try {
        const { email, displayName, photoURL, contactNumber, address } = req.body;
    
        // Upsert: Update the user if exists, otherwise insert a new user
        const result = await userCollection.updateOne(
          { email }, // Find the user by email
          {
            $set: {
              displayName,
              photoURL,
              contactNumber,
              address,
            },
          },
          { upsert: true } // Upsert: if the user doesn't exist, insert a new document
        );
    
        if (result.upsertedCount === 0 && result.modifiedCount === 0) {
          return res.status(500).send({ success: false, message: "Failed to update or insert user data" });
        }
    
        // Send success response
        res.send({ success: true, message: "User updated or inserted successfully" });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ success: false, message: error.message });
      }
    });




    app.post("/update-confirmation-status", verifyToken,verifyAdmin, async (req, res) => {
      try {
        // Extract the camp ID from the request parameters
        const {id, status}= req.body.data;
        // console.log("hello : __________new",id, status)
    
       const updatedCamp = await joinCampCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { confirmationStatus: status } }
          );

          const result = await paymentCollection.updateOne(
            { joinCampId: id },
            { 
              $set: { confirmationStatus: status } 
            },
            { upsert: true } // This will insert the field if it doesn't exist
          );  
    
      
          if (updatedCamp.modifiedCount === 0) {
            return res.status(500).send({ success: false, message: "Failed to update the confirmation status" });
          }
    
          res.send({ success: true, message: "Confirmation status updated successfully to 'Confirmed'" });
   
      } catch (error) {
        console.error("Error updating confirmation status:", error);
        res.status(500).send({ success: false, message: error.message });
      }
    });
    



    // _________Admin related API

    //_______________________users related api

    // AllUsers.jsx
    //private route
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const users = await userCollection.find({}).toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });


    // admin route
    app.get("/get-message", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const users = await messageCollection.find({}).toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // AllUsers.jsx
    //private route
    //admin
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await userCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    // _____________update user role

    app.post("/role", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const data = req.body;
        console.log(data);
        const id = data.id;
        const role = data.role;

        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the user by ID
          { $set: { role: role } } // Update the role
        );

        console.log(result);
        res.send(result);
      } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({ message: "Failed to update user role" });
      }

      // res.send(true);
    });

    //ManageItem.jsx
    //admin route
    app.post(
      "/update-menu-item",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { _id, name, recipe, category, price, image, imageUrls } =
            req.body;

          // Log received data for debugging
          // console.log("Update Data Received:", req.body);

          // Build the update object dynamically
          const updateFields = {
            name,
            recipe,
            category,
            price: parseFloat(price), // Ensure price is stored as a number
          };

          // Conditionally add image or imageUrls to the update object
          if (image) {
            updateFields.image = image;
          }
          if (imageUrls && Array.isArray(imageUrls)) {
            updateFields.imageUrls = imageUrls;
          }

          const query = {
            $or: [
              { _id: new ObjectId(_id) }, // Match ObjectId
              { _id: _id }, // Match string id
            ],
          };

          // Update the menu item in the database
          const result = await menuCollection.updateOne(
            query, // Match the menu item by ID
            { $set: updateFields } // Update the specified fields
          );

          // Log the result for debugging
          // console.log("Update Result:", result);

          // Respond with the result
          if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Menu item updated successfully" });
          } else {
            res
              .status(404)
              .json({ message: "Menu item not found or no changes made" });
          }
        } catch (error) {
          console.error("Error updating menu item:", error);
          res.status(500).json({ message: "Failed to update menu item" });
        }
      }
    );




    // admin route
    //ManageCamp
    app.post(
      "/update-camp-item",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const { 
            _id,
           campName,
            imageUrl,
            campFees,
            dateTime,
            location,
            healthcareProfessional,
            participantCount, // Default starting value
            description,  } =req.body;

          // Log received data for debugging
          console.log("Update Data Received:", req.body);

          // Build the update object dynamically
          const updateFields = {
            campName,
            imageUrl,
            campFees : parseFloat(campFees),
            dateTime,
            location,
            healthcareProfessional,
            participantCount, // Default starting value
            description, // Ensure price is stored as a number
          };

        

          const query = { _id: new ObjectId(_id) };

          // Update the menu item in the database
          const result = await campCollection.updateOne(
            query, // Match the menu item by ID
            { $set: updateFields } // Update the specified fields
          );

          // Log the result for debugging
          // console.log("Update Result:", result);

          // Respond with the result
          if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Menu item updated successfully" });
          } else {
            res
              .status(404)
              .json({ message: "Menu item not found or no changes made" });
          }
        } catch (error) {
          console.error("Error updating menu item:", error);
          res.status(500).json({ message: "Failed to update menu item" });
        }
      }
    );




    // ____________get login user data from user db

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req?.params?.email;
        // console.log("cookies : _______" , req?.cookies?.token);
        // console.log("email : ______ ", email);

        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "forbidden access" });
        }
        if (email) {
          const result = await userCollection.findOne({ email });

          console.log(result);
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "User is not an admin" });
          }
        }
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });





    app.get("/single-user/:email", verifyToken, async (req, res) => {
      try {
        const email = req?.params?.email;
        // console.log("cookies : _______" , req?.cookies?.token);
        // console.log("email : ______ ", email);

        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "forbidden access" });
        }
        if (email) {
          const result = await userCollection.findOne({ email });

          console.log(result);
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "User is not an admin" });
          }
        }
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });





// #new 

    app.post("/send-money",verifyToken, async (req, res) => {
      try {
        const { senderEmail, senderPhone, recipientPhone, amount } = req.body;
    
        if (!senderEmail || !recipientPhone || amount < 50) {
          return res.status(400).json({ success: false, message: "Invalid request" });
        }
    
        // Find sender, recipient, and admin
        const sender = await userCollection.findOne({ email: senderEmail });
        const recipient = await userCollection.findOne({ phone: recipientPhone });
        const admin = await userCollection.findOne({ accountType: "Admin" });
    
        if (!sender || !recipient || !admin) {
          return res.status(404).json({ success: false, message: "User/Admin not found" });
        }
    
        // Transaction fee logic
        const transactionFee = amount > 100 ? 5 : 0;
        const finalAmount = amount - transactionFee;
    
        if (sender.balance < amount + transactionFee) {
          return res.status(400).json({ success: false, message: "Insufficient balance" });
        }
    
        // Start Transaction
        const session = client.startSession();
        session.startTransaction();
    
        try {
          // Deduct balance from sender
          await userCollection.updateOne(
            { _id: sender._id },
            { $inc: { balance: -(amount + transactionFee) } },
            { session }
          );
    
          // Add balance to recipient
          await userCollection.updateOne(
            { _id: recipient._id },
            { $inc: { balance: finalAmount } },
            { session }
          );
    
          // Add fee to admin
          await userCollection.updateOne(
            { _id: admin._id },
            { $inc: { balance: transactionFee } },
            { session }
          );
    
          // Update total money in system (can be stored in a separate `systemCollection`)
          await systemCollection.updateOne(
            { key: "total_money" },
            { $inc: { amount: -transactionFee } },
            { upsert: true, session }
          );
    
          // Save transaction
          const newTransaction = {
            sender: sender.email,
            senderPhone:sender.phone,
            recipient: recipient.phone,
            amount,
            fee: transactionFee,
            totalAmount: amount + transactionFee,
            transactionId: `TXN${Date.now()}`,
            status: "Completed",
            date: new Date(),
            type:"Send Money"
          };
    
          await transactionsCollection.insertOne(newTransaction, { session });
    
          // Commit Transaction
          await session.commitTransaction();
          session.endSession();
    
          return res.json({
            success: true,
            message: "Money sent successfully",
            transaction: newTransaction,
            updatedBalance: sender.balance - (amount + transactionFee),
          });
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
        }
      } catch (error) {
        console.error("Error sending money:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
      }
    });





app.post("/cash-out", verifyToken,async (req, res) => {
  try {
    const { userEmail,userPhone, agentPhone, amount, pin } = req.body;

    if (!userEmail || !agentPhone || amount < 1) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    // Find user, agent, and admin
    const user = await userCollection.findOne({ email: userEmail });
    const agent = await userCollection.findOne({ phone: agentPhone, accountType: "Agent" });
    const admin = await userCollection.findOne({ accountType: "Admin" });

    if (!user || !agent || !admin) {
      return res.status(404).json({ success: false, message: "User, Agent, or Admin not found" });
    }

    // Verify PIN using bcrypt
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      return res.status(401).json({ success: false, message: "Invalid PIN" });
    }

    // Calculate fees
    const cashOutFee = (amount * 1.5) / 100; // 1.5% fee
    const agentEarning = (amount * 1) / 100; // 1% agent earning
    const adminEarning = (amount * 0.5) / 100; // 0.5% admin earning
    const totalDeduction = amount + cashOutFee; // Total deducted from the user

    if (user.balance < totalDeduction) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Start Transaction
    const session = client.startSession();
    session.startTransaction();

    try {
      // Deduct balance from user
      await userCollection.updateOne(
        { _id: user._id },
        { $inc: { balance: -totalDeduction } },
        { session }
      );

      // Add balance to agent
      await userCollection.updateOne(
        { _id: agent._id },
        { $inc: { balance: amount, earnings: agentEarning } },
        { session }
      );

      // Add earnings to admin
      await userCollection.updateOne(
        { _id: admin._id },
        { $inc: { earnings: adminEarning } },
        { session }
      );

      // Update total money in system (stored in `systemCollection`)
      await systemCollection.updateOne(
        { key: "total_money" },
        { $inc: { amount: -amount } },
        { upsert: true, session }
      );

      // Save transaction
      const newTransaction = {
        sender: user.email,
        senderPhone:user.phone,
        recipient: agent.phone,
        amount,
        fee: cashOutFee,
        transactionId: `TXN${Date.now()}`,
        status: "Completed",
        date: new Date(), 
        type:"Cash Out"
      };

      await transactionsCollection.insertOne(newTransaction, { session });

      // Commit Transaction
      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        message: "Cash-out successful",
        transaction: newTransaction,
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Error processing cash-out:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


app.get("/transactions", verifyToken, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email is required." });

    // Find user based on email
    const user = await userCollection.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // Fetch transactions related to the user
    const transactions = await transactionsCollection
      .find({
        $or: [{ sender: email }, { recipient: email }],
      })
      .sort({ date: -1 }) // Latest transactions first
      .limit(100)
      .toArray();

    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




app.post("/cash-in-user", async (req, res) => {
  try {
    const { agentEmail, userPhone, amount, pin } = req.body;

    if (!agentEmail || !userPhone || !amount || amount < 1 || !pin) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    // Find agent and user
    const agent = await userCollection.findOne({ email: agentEmail });
    const user = await userCollection.findOne({ phone: userPhone });

    if (!agent || !user) {
      return res.status(404).json({ success: false, message: "Agent or User not found" });
    }

    // Verify agent's PIN (Hashed)
    const isPinValid = await bcrypt.compare(pin, agent.pin);
    if (!isPinValid) {
      return res.status(400).json({ success: false, message: "Incorrect PIN" });
    }

    if (agent.balance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance in agent account" });
    }

    // Start Transaction
    const session = client.startSession();
    session.startTransaction();

    try {
      // Deduct balance from agent
      await userCollection.updateOne(
        { _id: new ObjectId(agent._id) },
        { $inc: { balance: -amount } },
        { session }
      );

      // Add balance to user
      await userCollection.updateOne(
        { _id: new ObjectId(user._id) },
        { $inc: { balance: amount } },
        { session }
      );

      await systemCollection.updateOne(
        { key: "total_money" },
        { $inc: { amount: amount } },
        { upsert: true, session }
      );

      // Save transaction
      const newTransaction = {
        sender: agent.email,
        senderPhone:agent.phone,
        recipient: user.phone,
        amount,
        transactionId: `TXN${Date.now()}`,
        type: "Cash-In",
        status: "Completed",
        date: new Date(),
      };

      await transactionsCollection.insertOne(newTransaction, { session });

      // Commit Transaction
      await session.commitTransaction();
      session.endSession();

      return res.json({ success: true, message: "Cash-In successful", transaction: newTransaction });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Error in Cash-In:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


app.post("/agent-request", async (req, res) => {
  try {
    const { agentEmail, requestType, agentId, agentName } = req.body;

    if (!agentEmail || !requestType) {
      return res.status(400).json({ success: false, message: "Invalid request data" });
    }

    // Create a new request
    const newRequest = {
      agentEmail,
      requestType,
      agentName,
      agentId,
      status: "Pending",  // Default status
      createdAt: new Date()

    };

    const result = await agentRequestsCollection.insertOne(newRequest);
    
    res.json({ success: true, message: "Request submitted successfully!", requestId: result.insertedId });

  } catch (error) {
    console.error("Error submitting request:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
//#199




app.get("/agent-requests", async (req, res) => {
  try {
    const { email, type} = req.query;

    if (!email || !type) {
      return res.status(400).json({ success: false, message: "Missing email or request type" });
    }

    // Fetch only requests of the specified type
    const requests = await agentRequestsCollection.find({
      agentEmail: email,
      requestType: type, // Ensure only the correct type is returned
     
    }).toArray();

    res.json({ success: true, requests });

  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




app.post("/withdraw-request", async (req, res) => {
  try {
    const { agentEmail, requestType, amount, agentId, agentName  } = req.body;
    if (!agentEmail || !requestType) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const agent = await userCollection.findOne({ email: agentEmail });
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    if (requestType === "Withdraw Request" && (!amount || amount <= 0)) {
      return res.status(400).json({ success: false, message: "Invalid withdrawal amount" });
    }

    const newRequest = {
      agentEmail,
      requestType,
        agentId,
       agentName ,
      amount: requestType === "Withdraw Request" ? amount : null,
      status: "Pending",
      createdAt: new Date(),
    };

    await agentRequestsCollection.insertOne(newRequest);
    res.json({ success: true, message: "Request submitted successfully" });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});



app.get("/admin-dashboard",verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Fetch total number of users
    const totalUsers = await userCollection.countDocuments({ accountType: "User" });

    // Fetch total number of agents
    const totalAgents = await userCollection.countDocuments({ accountType: "Agent" });

    // Fetch total money in the system from systemCollection
    const systemData = await systemCollection.findOne({});
    const totalMoney = systemData?.amount || 0;

    // Fetch Admin's earnings from userCollection where accountType = "Admin"
    const admin = await userCollection.findOne({ accountType: "Admin" });
    const adminEarnings = admin?.earnings || 0;

    // Send the response with dashboard data
    res.json({
      success: true,
      totalUsers,
      totalAgents,
      totalMoney,
      adminEarnings,
    });

  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});



app.post("/block-user", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    const updateUser = await userCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isBlocked } }
    );

    if (updateUser.modifiedCount === 0) {
      return res.status(400).json({ success: false, message: "Failed to update user status" });
    }

    res.json({ success: true, message: `User ${isBlocked ? "blocked" : "unblocked"} successfully` });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




app.get("/all-users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await userCollection.find({ accountType: "User" }).toArray();
    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});



app.get("/all-agents", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await userCollection.find({ accountType: "Agent" }).toArray();
    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


app.get("/admin/balance-requests",verifyToken, verifyAdmin, async (req, res) => {
  try {
    const requests = await agentRequestsCollection.find({ requestType: "Request Balance" }).sort({ createdAt: -1 }).toArray();

    // Fetch associated agent details (balance & earnings)
    for (const request of requests) {
      const agentDetails = await userCollection.findOne({ email: request?.agentEmail });


      request.agentDetails = agentDetails
        ? { 
          name: agentDetails?.name, 
          balance: agentDetails?.balance, 
          earnings: agentDetails?.earnings,
          phone: agentDetails.phone,
        }
        : null;
    }

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching balance requests:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




app.post("/admin/update-balance-request", verifyToken,verifyAdmin, async (req, res) => {
  try {
    const { requestId, agentEmail, action } = req.body;

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid request ID" });
    }

    // Find agent and update balance
    const agent = await userCollection.findOne({ email: agentEmail });
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    if (action === "Approve") {
      // Add 100,000 to agent's balance
      await userCollection.updateOne(
        { email: agentEmail },
        { $inc: { balance: 100000 } }
      );
    }

    // Update request status
    await agentRequestsCollection.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: action } }
    );

    res.json({ success: true, message: `Balance request ${action.toLowerCase()}ed successfully!` });
  } catch (error) {
    console.error("Error updating balance request:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// 📌 Fetch All Withdraw Requests (Admin)
app.get("/admin/withdraw-requests",verifyToken, verifyAdmin, async (req, res) => {
  try {
    const requests = await agentRequestsCollection.find({ requestType: "Withdraw Request" }).sort({ createdAt: -1 }).toArray();

    // Fetch associated agent details (earnings)
    for (const request of requests) {
      const agentDetails = await userCollection.findOne({ email: request?.agentEmail });
      request.agentDetails = agentDetails
        ? { 
          name: agentDetails?.name, 
          earnings: agentDetails?.earnings ,
          phone:agentDetails.phone,
        
        }
        : null;
    }

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching withdraw requests:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




app.post("/admin/update-withdraw-request",verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { requestId, agentEmail, amount, action } = req.body;

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid request ID" });
    }

    // Find agent and validate earnings
    const agent = await userCollection.findOne({ email: agentEmail });
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }

    if (action === "Approve") {
      if (agent.earnings < amount) {
        return res.status(400).json({ success: false, message: "Insufficient earnings!" });
      }

      // Deduct requested amount from agent's earnings
      await userCollection.updateOne(
        { email: agentEmail },
        { $inc: { earnings: - amount } }
      );
    }

    // Update request status
    await agentRequestsCollection.updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: action } }
    );

    res.json({ success: true, message: `Withdraw request ${action.toLowerCase()}ed successfully!` });
  } catch (error) {
    console.error("Error updating withdraw request:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});










    app.get("/checkUser/:email", async (req, res) => {
      try {
        const email = req?.params?.email;
        if (email) {
          const result = await userCollection.findOne({ email });

          if(result.isApproved){
            res.send({ success: true, message: "User is approved" });
          } else {
            res.send({ success: false, message: "User is not approved" });
          }
        }
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });



    app.get("/get-reply-message/:email", verifyToken, async (req, res) => {
      try {
        const email = req?.params?.email;
        // console.log("cookies : _______" , req?.cookies?.token);
        // console.log("email : ______ ", email);

        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "forbidden access" });
        }
        if (email) {

          const result = await replyMessageCollection.find({ email }).toArray();

          console.log(result);
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "wring email" });
          }
        }
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });






// Contact
//public route
    app.post("/upload-message", async (req, res) => {
        try {
          const message = req.body;
          
           // Insert menu item into MongoDB
           const result = await messageCollection.insertOne(message);

          if (result.acknowledged) {
            res.send(result);
          } else {
            res.status(500).json({ message: "Failed to add message item." });
          }
        } catch (error) {
          console.error("Error uploading message:", error.message);
          res.status(500).json({ message: "Internal server error." });
        }
      }
    );


    app.post("/upload-reply-message",verifyToken, async (req, res) => {
        try {
          const message = req.body;
          
           // Insert menu item into MongoDB
           const result = await replyMessageCollection.insertOne(message);

          if (result.acknowledged) {
            res.send(result);
          } else {
            res.status(500).json({ message: "Failed to add message item." });
          }
        } catch (error) {
          console.error("Error uploading message:", error.message);
          res.status(500).json({ message: "Internal server error." });
        }
      }
    );




    //AddACamp.jsx
    //admin route
    app.post("/upload-a-camp",verifyToken,verifyAdmin, async (req, res) => 
      {
        try {
          
          const  { 
            campName,
            imageUrl,
            campFees,
            dateTime,
            location,
            healthcareProfessional,
            participantCount, // Default starting value
            description,
           } = req.body;


           const data = {
            campName,
            imageUrl,
            campFees : parseFloat(campFees),
            dateTime,
            location,
            healthcareProfessional,
            participantCount, // Default starting value
            description,
           }
          // Create menu item object
       
          console.log(data);
          // Insert menu item into MongoDB
          const result = await campCollection.insertOne(data);

          if (result.acknowledged) {
            res.send(result);
          } else {
            res.status(500).json({ message: "Failed to add menu item." });
          }
        } catch (error) {
          console.error("Error uploading menu item:", error.message);
          res.status(500).json({ message: "Internal server error." });
        }
      }
    );



    app.post("/upload-photos",verifyToken,verifyAdmin, async (req, res) => 
      {
        try {
          
          const data = req.body;
       
          // console.log(data);
          // Insert menu item into MongoDB

          const result = await galleryCollection.insertOne(data);

          if (result.acknowledged) {
            res.send(result);
          } else {
            res.status(500).json({ message: "Failed to add menu item." });
          }
        } catch (error) {
          console.error("Error uploading menu item:", error.message);
          res.status(500).json({ message: "Internal server error." });
        }
      }
    );



    app.post("/upload-article",verifyToken,verifyAdmin, async (req, res) => 
      {
        try {
          
          const data = req.body;
       
          console.log(data);
          // Insert menu item into MongoDB

          const result = await articleCollection.insertOne(data);

          if (result.acknowledged) {
            res.send(result);
          } else {
            res.status(500).json({ message: "Failed to add menu item." });
          }
        } catch (error) {
          console.error("Error uploading menu item:", error.message);
          res.status(500).json({ message: "Internal server error." });
        }
      }
    );


    app.get("/get-article", async (req, res) => 
      {
        try {
          
         

          const result = await articleCollection.find({}).toArray();

          if (result) {
            res.send(result);
          } else {
            res.status(500).json({ message: "Failed to add menu item." });
          }
        } catch (error) {
          console.error("Error uploading menu item:", error.message);
          res.status(500).json({ message: "Internal server error." });
        }
      }
    );





    // ManageMenuItem.jsx cross
    //private route
    //admin
    app.delete("/menu-item/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = {
          $or: [
            { _id: new ObjectId(id) }, // Match ObjectId
            { _id: id }, // Match string id
          ],
        };
        const result = await menuCollection.deleteOne(query);
        console.log(result);
        if (result.deletedCount > 0) {
          res.send(result);
        }
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });





       // ManageMenuItem.jsx
    //private route
    //admin
    app.delete("/camp-item/:id", verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) }; // Match ObjectId
           
         
        const result = await campCollection.deleteOne(query);
        console.log(result);
        if (result.deletedCount > 0) {
          res.send(result);
        }
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });



    app.delete("/delete-reply-message/:id", verifyToken,  async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) }; // Match ObjectId
           
         
        const result = await replyMessageCollection.deleteOne(query);
        console.log(result);
        if (result.deletedCount > 0) {
          res.send(result);
        }
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });



    app.delete("/delete-message/:id", verifyToken,  async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);
        const query = { _id: new ObjectId(id) }; // Match ObjectId
           
         
        const result = await messageCollection.deleteOne(query);
        console.log(result);
        if (result.deletedCount > 0) {
          res.send(result);
        }
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });





    //____________ stripe payment intent

    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { totalPrice } = req.body;
        // console.log(totalPrice);

        // Validate totalPrice
        if (!totalPrice || totalPrice <= 0) {
          return res.status(400).send({ error: "Invalid total price" });
        }

        // // Create a PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalPrice * 100), // Convert to cents for USD
          currency: "usd",
          payment_method_types: ["card"], // Specify payment methods
        });

        // console.log(paymentIntent.client_secret);

        // Send client_secret to the client
        res.status(200).send({
          client_secret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating PaymentIntent:", error);
        res.status(500).send({ error: error.message });
      }
    });







    app.post("/payments", async (req, res) => {
      try {
        const payment = req.body;
        const { joinCampId } = payment;
    
        console.log("Payment Request:", payment);
    
        // Insert payment details into paymentCollection
        const paymentResult = await paymentCollection.insertOne(payment);
    
        if (paymentResult.insertedId) {
          // Update the paymentStatus in joinCampCollection to "paid"
          const updateResult = await joinCampCollection.updateOne(
            { _id: new ObjectId(joinCampId) }, // Match the joinCampId
            { $set: { paymentStatus: "paid" } } // Update paymentStatus to "paid"
          );
    
          if (updateResult.modifiedCount > 0) {
            console.log("Payment status updated successfully.");
            res.send({ success: true, message: "Payment recorded and status updated.", paymentId: paymentResult.insertedId });
          } else {
            console.error("Failed to update payment status in joinCampCollection.");
            res.status(400).send({ error: "Payment recorded but failed to update payment status." });
          }
        } else {
          console.error("Failed to record payment.");
          res.status(400).send({ error: "Failed to record payment." });
        }
      } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).send({ error: error.message });
      }
    });
    



    app.get("/payment-history/:email", verifyToken, async (req, res) => {
      try {
        const email = req?.params?.email;
        // console.log("cookies : _______" , req?.cookies?.token);
        // console.log("email : ______ ", email);

        console.log(email);
        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "forbidden access" });
        }
        if (email) {
          const result = await paymentCollection.find({ email }).toArray();

          // console.log(result)
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "error" });
          }
        }
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });



    app.get("/all-payment-history", verifyToken, verifyAdmin, async (req, res) => {
      try {
       
      const result = await paymentCollection.find({ }).toArray();

          // console.log(result)
          if (result) {
            res.send(result);
          } else {
            res.send({ success: false, message: "error" });
          }
        
      } catch (error) {
        console.error("Error finding user:", error);
        res.status(500).json({ message: "Failed to find user" });
      }
    });

    


    app.get("/admin-stats/:email", verifyToken,verifyAdmin, async (req, res) => {
      try {
        const email = req?.params?.email;

        const menuCollection = db.collection("menu");
        const userCollection = db.collection("users");
        const paymentCollection = db.collection("payments");

        // Ensure the email in the token matches the requested email
        if (req?.user?.email !== email) {
          return res
            .status(403)
            .json({ success: false, message: "Forbidden access" });
        }

        // Basic counts
        const paymentCount = await paymentCollection.countDocuments({});
        const userCount = await userCollection.countDocuments({});
        const menuCount = await menuCollection.countDocuments({});

        // Aggregate total revenue
        const revenueResult = await paymentCollection
          .aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $toDouble: "$amount" } },
              },
            },
          ])
          .toArray();
        const revenue = revenueResult[0]?.totalRevenue || 0;

        // Category-wise item counts from menuCollection
        const categoryCounts = await menuCollection
          .aggregate([
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const categoryWiseCount = categoryCounts.reduce(
          (acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
          },
          {}
        );

        // Calculate category-wise revenue using aggregation
        const categoryWiseRevenueArray = await paymentCollection
          .aggregate([
            {
              $lookup: {
                from: "menu",
                localField: "itemIds",
                foreignField: "_id",
                as: "menuItems",
              },
            },
            { $unwind: "$menuItems" }, // Deconstruct the menuItems array
            {
              $group: {
                _id: "$menuItems.category",
                totalRevenue: { $sum: { $toDouble: "$menuItems.price" } },
              },
            },
            {
              $project: {
                _id: 0,
                category: "$_id",
                totalRevenue: 1,
              },
            },
          ])
          .toArray();

        const categoryWiseRevenue = categoryWiseRevenueArray.reduce(
          (acc, { category, totalRevenue }) => {
            acc[category] = totalRevenue;
            return acc;
          },
          {}
        );

        // Response
        res.status(200).json({
          paymentCount,
          userCount,
          menuCount,
          revenue,
          categoryWiseCount,
          categoryWiseRevenue,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        res
          .status(500)
          .json({ success: false, message: "Failed to retrieve admin stats" });
      }
    });



// AddReview.jsx page
    app.post("/reviews", verifyToken, async (req, res) => {
      try {
        const {  
          rating,
          feedback,
          participantName,
          campName,
          createdAt,} = req.body;

        // console.log("Review___________: ", name);
        // Insert review into the database
        const result = await reviewCollection.insertOne({
          rating: parseInt(rating),
          feedback,
          participantName,
          campName,
          createdAt,
        });

        // console.log(result);
        if (result.acknowledged) {
          res.status(201).send(result);
        }
      } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ message: "Failed to add review." });
      }
    });






    // AllUsers.jsx
    //private route
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("Server is running");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
