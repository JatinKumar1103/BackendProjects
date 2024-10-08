import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken.js"


const generateAccessAndRefreshToken = async(userId) => {
    try {
       const user =await User.findById(userId)
       const accessToken = user.generateAccessToken();
       
       const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}


const registerUser = asyncHandler(async (req,res) => {
   //get user details from frontend 
   //validation - not empty
   //check if user already exists:username, email
   //check for images and check for avatar
   //upload them on cloudinary, avatar
   // create user object - create entry in db
   // remove password and refresh token field from response 
   // check for user creation
   // return response 

    const {fullName, email, password, username} = req.body;
    // console.log("email: ", email); 

    // if(fullName === ""){
    //     throw new ApiError(400, "fullName is required")
    // } // we can check for every field individually by using if condition or we can use this next approach.

    if(
        [fullName, email, username, password].some((field)=> field?.trim() ==="")
    ){
        throw new ApiError(400, "All fields are required")
    }
    // if user already exists

    const existedUser =await User.findOne({
        $or : [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }
    // check for images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    //check for avatar
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log(avatar);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //checking if avatar uploaded or not

    if(!avatar){
        throw new ApiError(500, "Error uploading avatar on cloudinary")
    }

    //create user object

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //check for userCreation and remove password and refreshToken from it

    const createdUser = await User.findById(user.id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Error registring user")
    }

    // return response

    return res.status(201).json(
        new ApiResponse(200, createdUser,"User Registered successfully")
    )
    
})

    //login user steps
    //req body data
    //check for username or email 
    //find the user
    //check password
    //access and refresh tokem
    //send cookies
const loginUser = asyncHandler(async (req,res) => {
    //req body data
    const{email, username, password}  = req.body;

    //check for username and email
    // if(!username && !email){
    //     throw new ApiError(400, "username or email is required");
    // }

    if(!(username || email)){
        throw new ApiError(400, "username or email is required");
    }


    const user = await User.findOne({
        $or : [{username }, {email}]
    })
    // find the user
    if(!user){
        throw new ApiError(404, "User not found")
    }

    //check password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Password is incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(new ApiResponse(
        200, 
        {
            user: loggedInUser,accessToken,refreshToken
        },
        "User logged in Successfully"
    ))
 })

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
        $set:{
            refreshToken:undefined
        }
    },
    {
        new : true
    }
) 

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
    
        }
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken , newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",newrefreshToken , options)
        .json(
            new ApiResponse(       
                    200,
                    {
                        accessToken, refreshToken: newrefreshToken
                    },
                    "Access Token Refreshed Successfully"     
            )
        )
    } catch (error) {
        throw new ApiError(401, error.message || "Invalid RefreshToken" )
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken

} ;