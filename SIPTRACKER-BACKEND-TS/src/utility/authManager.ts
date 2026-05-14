import jwt, { type JwtPayload } from "jsonwebtoken";
const secret : string = "qsxcvbhutreaxchj845268";

export function generateToken(payload : any){
    return jwt.sign(
        payload,
        secret, {
            "expiresIn" : "1h"
        }
    );
};

export function verifyJWT(token : string){
    return jwt.verify(
        token,
        secret
    )
}