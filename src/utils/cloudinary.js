import{v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
       if(!localFilePath) return null; //if file is not available
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        });//file successfully uploaded on cloudinary
        // console.log("file successfully uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath)//used to remove temporary files
        return null;
    }
}

export {uploadOnCloudinary}