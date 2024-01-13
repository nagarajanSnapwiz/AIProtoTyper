export function fileToDataUrl(file: Blob ){
    return new Promise((resolve,reject)=>{
        const fr = new FileReader();
        fr.addEventListener("load",(e)=>{
            if(e.target?.result){
                resolve(e.target?.result); 
            }
        });

        fr.addEventListener("error",(e)=>{
            reject(e);
        })

        fr.readAsDataURL(file);
    });
}
