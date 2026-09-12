const Listing = require("../models/listing.js");

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};


// CATEGORY LISTINGS
module.exports.categoryListings = async (req, res, next) => {
    try {
        const { category } = req.params;

        const listings = await Listing.find({
            category: category
        });

        res.render("listings/category.ejs", {
            listings,
            category
        });

    } catch (err) {
        next(err);
    }
};

module.exports.trendingListings = async (req, res, next) => {
    try {
        const allListings = await Listing.find({}).populate("reviews");

        const trendingListings = allListings.filter((listing) => {

            const totalReviews = listing.reviews.length;

            const goodReviews = listing.reviews.filter(
                (review) => review.rating >= 4
            ).length;

            return totalReviews > 2 && goodReviews >= 2;
        });

        res.render("listings/category.ejs", {
            listings: trendingListings,
            category: "Trending"
        });

    } catch (err) {
        next(err);
    }
};


module.exports.renderNewForm = async (req, res) => {
    await res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res, next) => {
    try {
        let { id } = req.params;
        const listing = await Listing.findById(id)
            .populate("owner")
            .populate({
                path: "reviews",
                populate: {
                    path: "author"
                }
            });
        if (!listing) {
            req.flash(
                "error",
                "Listing does not exist!"
            );
            return res.redirect("/listings");
        }
        res.render("listings/show.ejs", {
            listing
        });
    } catch (err) {
        next(err);
    }
};

module.exports.createListing = async (req, res, next) => {
    try {
        let url = req.file.path;
        let filename = req.file.filename;
        const listing = new Listing(req.body.listing);
        listing.owner = req.user._id;
        listing.image = {
            url,
            filename
        };
        // Get location entered by user
        const location = req.body.listing.location;
        // Nominatim Geocoding
        const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
            {
                headers: {
                    "User-Agent": "WanderLust/1.0"
                }
            }
        );
        const data = await response.json();
        // Check if location was found
       if (data.length > 0) {

            const latitude = parseFloat(data[0].lat);
            const longitude = parseFloat(data[0].lon);

        listing.geometry = {
            type: "Point",
            coordinates: [
                longitude,
                latitude
        ]
    };

    } else {

        req.flash(
        "error",
        "Location could not be found!"
        );

        return res.redirect("/listings/new");
    }
        await listing.save();
        req.flash(
            "success",
            "New listing created!"
        );
        res.redirect(`/listings/${listing._id}`);
    } catch (err) {
        next(err);
    }
};

module.exports.searchListings = async (req, res, next) => {
    try {
        const { location } = req.query;

        if (!location || location.trim() === "") {
            return res.redirect("/listings");
        }

        const searchLocation = location.trim();

        // Search using Nominatim
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                searchLocation
            )}&format=json&polygon_geojson=1&limit=1`,
            {
                headers: {
                    "User-Agent": "HodoPhilic/1.0"
                }
            }
        );

        const data = await response.json();

        let listings = [];

        if (data.length > 0 && data[0].geojson) {
            const geojson = data[0].geojson;

            listings = await Listing.find({
                geometry: {
                    $geoWithin: {
                        $geometry: geojson
                    }
                }
            });
        }

        // Also search location text
        const textListings = await Listing.find({
            location: {
                $regex: searchLocation,
                $options: "i"
            }
        });

        // Combine results
        const allResults = [...listings, ...textListings];

        // Remove duplicates
        const uniqueListings = Array.from(
            new Map(
                allResults.map(listing => [
                    listing._id.toString(),
                    listing
                ])
            ).values()
        );

        // ❌ NO RESULTS
        if (uniqueListings.length === 0) {

            req.flash(
                "error",
                `No listings found for "${searchLocation}"`
            );

            return res.redirect("/listings");
        }

        // ✅ RESULTS FOUND
        req.flash(
            "success",
            `${uniqueListings.length} listings found in "${searchLocation}"`
        );

        res.render("listings/search.ejs", {
            listings: uniqueListings,
            searchLocation
        });

    } catch (err) {
        next(err);
    }
};

module.exports.renderEditForm = async(req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing which you are requested for does not exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", {listing, originalImageUrl});
};

module.exports.updateListing = async(req, res) => {
    let {id} = req.params;
    let {image, ...rest} = req.body.listing;
    let imageUrl;
    let listing = await Listing.findByIdAndUpdate(id, {...rest, "image.url": imageUrl }, {returnDocument: "after", runValidators: true});
    if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
    }
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`); 
};

module.exports.destroyListing = async(req, res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing deleted!");
    res.redirect("/listings");
};