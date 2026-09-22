import {LENS_KEYS,buildLensCache,findImages,isEinsteinRing,renderBrightness} from './epl-model.mjs';
let key='',cache=null;
self.onmessage=({data})=>{
 try{
  const {params,source,resolution,sourceField,id}=data;
  const nextKey=JSON.stringify([resolution,...LENS_KEYS.map(k=>params[k])]);
  if(nextKey!==key){cache=buildLensCache(params,resolution);key=nextKey;}
  const ring=isEinsteinRing(params,source),images=findImages(params,source,cache);
  const {sourcePixels,imagePixels}=renderBrightness(params,source,cache,sourceField);
  self.postMessage({id,params,source,resolution,sourceField,ring,images,curves:cache.curves,sourcePixels,imagePixels},[sourcePixels.buffer,imagePixels.buffer]);
 }catch(error){self.postMessage({id:data.id,error:error.message});}
};
