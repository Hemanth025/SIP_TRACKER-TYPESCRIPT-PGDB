import {createClient, type RedisClientType} from "redis";

const client : RedisClientType = createClient({
    url : process.env.REDIS_URL || "redis://localhost:6379",
    socket : {
        reconnectStrategy: false
    }
});

client.on("connect", () => {
    console.log("Redis Connected Successfully.. ");
})

client.on("error", (error: Error) => {
    console.error(`Redis Error : ${error.message}`);
})

export const connectRedis = async () : Promise<void> => {
    try {
        if(!client.isOpen){
            await client.connect();
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`Redis Unavailable, continuing without cache: ${msg}`);
    }
}

const safeRedisCall = async <T> (
    operation: () => Promise <T>, fallback: T | null = null) : Promise<T | null> => {
        try {
            if(!client.isReady){
                return fallback;
            }
            return await operation();
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`Redis cache Skipped : ${msg}`);
            return fallback;
        }
}

export const redisClient = {
    get isOpen() : boolean{
        return client.isOpen;
    },
    get isReady() : boolean{
        return client.isReady;
    },
    get: (key : string) => safeRedisCall(() => client.get(key)),

    set: (key : string, value : string, options?:any) => safeRedisCall(() => client.set(key, value, options)),

    del: (key : string) => safeRedisCall(() => client.del(key), 0)
}