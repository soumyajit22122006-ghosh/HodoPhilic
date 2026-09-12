const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/hodophilic";

main()
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});

    const user = await User.findOne();

    if (!user) {
        console.log("No user found. Please create a user first.");
        return;
    }

    initData.data = initData.data.map((obj) => ({
        ...obj,
        owner: user._id
    }));

    await Listing.insertMany(initData.data);

    console.log("data was initialized");
};

initDB();