const fetch_form=document.querySelector('form');                                // to get input playlist link
const loading_animation=document.getElementById('container-loading');           // for loading animation
const playlistContainer=document.querySelector('.playlistContainer');           // for grid container to show tracks 
const error_wrapper=document.querySelector('.error-wrapper');                   // for error message if any request fails
const select_all=document.querySelector('.select_all');                         // to get tracks selected for downloading
const btn_wrapper=document.querySelector('.btn-wrapper');                       // download button wrapper
const download_btn=document.querySelector('.download');                         // for download button

// functions to manipulate cookies
// function to set cookie value with name, value and expiry after 'secs' seconds
function setCookie(name, value, secs){
    const date = new Date                                       // create date object to manipulate dates
    date.setTime(date.getTime() +  (secs * 1000));              // get date after 'secs' time passed from current time i.e time of making cookie
    let expires = "expires=" + date.toUTCString();              // set expires value to time calculated
    document.cookie = `${name}=${value}; ${expires}; path=/`;   // make cookie with respective values in required standard notation
}
// function to delete cookie - make expiry as null
function deleteCookie(name){
    setCookie(name, null, null);
}
// function to get value of cookie if exists
function getCookie(name){
    const cDecoded = decodeURIComponent(document.cookie);       // get cookie and decode from URL notation
    const cArray = cDecoded.split("; ");                        // split by ';', as per the required notation
    let result = null;                                          // set result initially to null, to check if cookie not present
    
    cArray.forEach(element => {                                 // for each cookie
        if(element.indexOf(name) == 0){                         // if it starts with 'name' of required cookie
            result = element.substring(name.length + 1);        // name.length will give index of '=' and +1 will give starting index of value
        }
    });
    return result;                                              // return value of cookie/ return null if not found
}


// function to get spotify key
// the spotify key works for 1 hr, so this function checks if spotify key is still avaible in cookies
// if not, get the key and store in cookies with expiry after 1 hour
async function get_Soptify_key(){               // run asynchronously
    try {                                       // try-catch block to catch and handle any errors(basically for error animation)
        const cname='spotify_api_key';          // set a name of cookie
        let api_key = getCookie(cname);         // use getCookie function to get the key
        if(api_key===null){                     // if key is null, i.e. key not available in cache, then generate new key
            // getch to get key, look Spotify Authorization guide for more info (https://developer.spotify.com/documentation/general/guides/authorization/).
            // I'm used Client Credentials Flow since I don't plan to handle private playlists
            const response = await fetch("https://accounts.spotify.com/api/token", {
                method: 'POST',
                headers: {
                'Authorization': 'Basic NTk5MGIzNTAzYjhjNGY1OWJjZTAxZjJiYjY2Mjc5NDI6NmQ5ZjFlMmJhNmM0NDU1ODk2YTFjYjBkMjQ0YWM5NTc=',
                'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'grant_type':'client_credentials',
                }),
            });
            api_key = await response.json().then(data => data.token_type+" "+data.access_token);    // got and created api_key from spotify
            setCookie(cname, api_key, 3600);        // set the api_key to cookie for future use
        }
        return api_key;
    } catch (err) {
        console.log('Unable to get a valid api for Spotify');
        console.log(err);
        loading_animation.style.opacity=0;
        playlistContainer.style.opacity=0;
        error_wrapper.style.display='flex';
        setTimeout(() => {
            loading_animation.style.display='none';
            playlistContainer.style.display='none';
            select_all.style.display='none';
            btn_wrapper.style.display='none';
            error_wrapper.style.opacity=1;
        }, 500);
        throw err;              // throw error again so that code does not progress ahed;
    }
}


fetch_form.addEventListener('submit',(e)=>{

    e.preventDefault();                                             // prevents default behaviour of submit action
    fetch_playlist(e.target.elements.playlist_link.value);          // gets link entered using function fetch_playlist
    fetch_form.classList.toggle('top');                             // makes space for tracks to display by moving form to top
    loading_animation.style.display='inline-block';                 // shows loading animation till tracks not loaded
    setTimeout(() => {                                              // timeout used to make transitions smooth
        loading_animation.style.opacity=1;
        fetch_form.elements.button.style.display='none';            // makes fetch button disappear
    }, 500);
});


async function fetch_playlist(url) {                            // gets url of playlist as url
    try {                                                       // to handle error and show error animation
        const spotify_key = await get_Soptify_key();            // gets spotify key (from cookie or by making request)
        const options_spotify = {                               // options and headers for spotify request
            method: 'GET',
            headers: {
                'Authorization': spotify_key,
                'Content-Type': 'application/json'
            }
        };

        const playlist_id=url.split('/').at(-1);                // get playlist id from playlist link
        // gets tracks form playlist by making request to spotify using playlist_id and options, converts result from json
        let playlist = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,options_spotify).then(res=>res.json())
        let tracks_detailed=playlist.items;                     // get required values from the json object
        const total_tracks=playlist.total;                      // total tracks
        let loaded=playlist.items.length;                       // number of tracks fetched this time
        // make request till all tracks info is not received
        while(loaded<total_tracks){
            playlist = await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks?offset=${loaded}`,options_spotify).then(res=>res.json());                                                    // make request
            tracks_detailed =tracks_detailed.concat(playlist.items);    // concatinate now fetched tracks to already existing tracks
            loaded+=playlist.items.length;                              // increase loaded tracks count
        }

        const tracks = tracks_detailed.flatMap(itm => {         // flatMap works great to remove any unwanted tracks
            // if name and image of track not available(for perticular country)
            if(!itm.track||itm.track.name.length==0||itm.track.album.images.length==0)
                return [];                                      // dont consider this element(to remove an elememnt, just return empty string)
            
            // get required details form resulted tracks
            let image_small,image_big;                          
            itm.track.album.images.forEach(element => {
                if(element.height==64)
                    image_small=element.url;
                else if(element.height<=300)
                    image_big=element.url;
            });
            // convert list of artists in elegent english list
            let a = itm.track.artists.map(ele => ele.name);
            const artists = a.length == 1 ? a[0] : [ a.slice(0, -1).join(", "), a[a.length - 1] ].join(" and ");
            // return required values in object notation
            return ({
                name: itm.track.name,
                img_small: image_small,
                img_big: image_big,
                artists: artists,
            });
        });

        // make appropriate changes to DOM for loading tracks
        loading_animation.style.opacity=0;                      // remove loading animation
        playlistContainer.style.display='grid';                 // show container for tracks
        select_all.style.display='unset';                       // show select all button
        btn_wrapper.style.display='flex';                       // show download button
        
        // for every track, add div element to represent it, add name of track, artists names, img of track
        tracks.forEach(itm => {
            playlistContainer.innerHTML=playlistContainer.innerHTML+
            `<div class="playlistSong" title='${itm.name} by ${itm.artists}'>
                <img src="${itm.img_small}" data-src="${itm.img_big}"/>
                <span>${itm.name}</span>
            </div>`;
            // src is initially set to low resolution image where as data-src(user defined attribute) stores link to high res image
            // this is used for lazzy loading later
        });

        // get all tracks, its done now since these are added dynamically just now
        const song_nodes = document.querySelectorAll('.playlistSong');

        // on each created track node, add EventListener for 'click', so that tracks can be selected for download
        song_nodes.forEach(ele => {
            ele.addEventListener('click',e => {
                e.currentTarget.classList.toggle('selected');
            });
        });

        // this piece of code is done for lazzy loading of track images
        let imageOptions={};                                        // stores all elements for lazzy laoding
        // an IntersectionObserver is made which efficiently checks if an element is on screen
        let observer = new IntersectionObserver((entries, observer) =>{                 // entries tracks all elements to observer
            entries.forEach(entry => {                              // for every entry
                if(!entry.isIntersecting)   return;                 // if that element not intersecting, return from code
                const img=entry.target;                             // if intersecting, get the target element
                img.src=img.getAttribute('data-src');               // mark source of img tag as high res image, hence lazzy loading
                observer.unobserve(img);                            // dont observe the element any more once high res image set
            });
        }, imageOptions);                                           // imageOptions passed as entries
        song_nodes.forEach(ele => {
            observer.observe(ele.querySelector('img'));             // observe for intersection for every track image
        })

        // functionality for select all button
        select_all.addEventListener('click',() => {
            if(document.querySelectorAll('.selected').length>tracks.length/2){              // checks if more than half of tracks selected
                song_nodes.forEach(ele => {
                    ele.classList.remove('selected');                                       // remove all selected tracks
                });
            } else {
                song_nodes.forEach(ele => {
                    ele.classList.add('selected');                                          // else, less than half tracks selected, mark all tracks as selected
                });
            }
        })

        // change DOM properties for showing tracks after everything is ready
        setTimeout(() => {
            loading_animation.style.display='none';
            playlistContainer.style.opacity=1;
            playlistContainer.style.transform='none';
            select_all.style.opacity=1;
            select_all.style.transform='none';
            btn_wrapper.style.opacity=1;
            btn_wrapper.style.transform='none';
        }, 500);
    } catch (err) {
        // handling error and show error animation
        console.log(err);
        console.log("Unable to retrive playlist from Spotify");
        loading_animation.style.opacity=0;
        playlistContainer.style.opacity=0;
        error_wrapper.style.display='flex';
        setTimeout(() => {
            loading_animation.style.display='none';
            playlistContainer.style.display='none';
            select_all.style.display='none';
            btn_wrapper.style.display='none';
            error_wrapper.style.opacity=1;

        }, 500);
    }
};

// function to show error animation, after tracks have been shown
function errorAnimation() {
    playlistContainer.style.opacity=0;
    select_all.style.opacity=0;
    btn_wrapper.style.opacity=0;
    setTimeout(() => {
        playlistContainer.style.display='none';
        select_all.style.display='none';
        btn_wrapper.style.display='none';
        error_wrapper.style.display='flex';
        setTimeout(() => {
            error_wrapper.style.opacity=1;
        }, 50);
    }, 250);
}

// removes any download progress related class from the download button
function removeProgress() {
    download_btn.classList.forEach(HTMLclass=>{
        if(HTMLclass.includes('progress-')){
            download_btn.classList.remove(HTMLclass);
        }
    });
}

function makeTextFile (text) {
    const data = new Blob([text], {type: 'text/plain'});
    // returns a URL to be used as a href
    return window.URL.createObjectURL(data);
};

// Youtube api keys
// multiple keys for better performance
const yt_api_keys = ['AIzaSyAudHAlP_QuBg_J0nThIquPdes5mlyUbTI',                 // unknown
                    'AIzaSyD182zbRPOvR1aVKudj7091tNcwihLZ-Tk',                  // nit
                    'AIzaSyB8hj6daVtJJrf6zn_TFo33MZzUuMLbFfM'];                 // me
let yt_key_no=0;                                                                // track which key in use

// listen click event on download button
download_btn.addEventListener('click',async function downloader () {
    const selected_songs=document.querySelectorAll('.selected');
    // if nothings selected, alert to select atleast 1 track
    if (selected_songs.length==0) {
        alert('Please select atlest 1 track');
        return;
    }
    
    btn_wrapper.classList.add('is-active');                                     // start downloading animation
    
    let yt_songs_promises=[];                                                   // empty list to store promises retured by fetch
    try {
        // for every selected track, get its youtube video id
        for (let i = 0; i < selected_songs.length; i++) {
            // search the title of song on youtube and grab the first result
            let yt_song=await fetch(`https://youtube.googleapis.com/youtube/v3/search?type=video&part=snippet&q=${selected_songs[i].title}&maxResults=1&key=${yt_api_keys[yt_key_no]}`);
            if(yt_song.ok)
                yt_songs_promises.push(yt_song.json());                         // return json response as promise
            else if(yt_song.status==403){                                       // status 403 indicated quota exceeded
                console.log(`Quota of key ${yt_key_no+1} exceeded`);
                yt_key_no++;                                                // go to next key
                i--;                                                        // this track's id is not available, try for this track again
                continue;
            } else {
                console.log('Error with Youtube API');
                throw new Error("Error with Youtube API");                      // if any error
            }
        }
    } catch (error) {
        errorAnimation();                                                       // if error encountered, show error animation
        return;
    }

    // promise.all weights for all the promises to resolve, then take the resulting array and get videoId for every track
    const yt_songs=await Promise.all(yt_songs_promises).then(res=>res.map(ele=>ele.items[0].id.videoId));

    // show progress as 30%
    download_btn.classList.add('progress-30');

// this code can be used if only 1 key is available
    
    // const yt_songs = await Promise.all([...selected_songs].map(async song => {
    //     const yt_song=await fetch(`https://youtube.googleapis.com/youtube/v3/search?type=video&part=snippet&q=${song.title}&maxResults=1&key=AIzaSyBrAlTFlkhwRvYhHWhpJORxPGmJPTKX0w0`).then(res=>{
    //         if(res.ok)
    //             return res.json();
    //         else if(res.status==403 || res.error.error[0].reason=='quotaExceeded'){
    //             yt_key_no++;
    //         }
    //         else
    //             throw res.json();
    //     }).catch(err=>{
    //         err.then(res=>console.log(res.error.errors[0].reason));
    //         errorAnimation();
    //         throw new Error('Error in Youtube API');
    //     });
    //     return ({
    //         title: song.title,
    //         videoId:yt_song.items[0].id.videoId,
    //     });
    // }));
    // console.log(yt_songs);



    const options_ytmp3 = {
        // header options for youtube to mp3 convert api
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': 'b6b0a51596mshe7dccd1e4e96c86p1d4dc1jsn97518b11c4fc',
            'X-RapidAPI-Host': 'youtube-mp3-download1.p.rapidapi.com'
        }
    };
    const downloadLinks = await Promise.all(yt_songs.map(async songId=>{
        // get links for downloading converted mp3 for each track
        const link = await fetch(`https://youtube-mp3-download1.p.rapidapi.com/dl?id=${songId}`, options_ytmp3)
            .then(res =>{
                if(res.ok)
                    return res.json();
                else
                    throw res.json();                                       // if response not ok, throw error
            }).then(res=>res.link)
            .catch(err=>{
                console.log(err);
                errorAnimation();
                throw new Error('Error in Youtube to mp3 conversion API');
            });
        return link;
    }));
    
    removeProgress();
    download_btn.classList.add('progress-50');

    // following code checks if popups are allowed, opens 2 blank popups and returns a promise.
    // promise will be resolved giving 1 if popup window is closed without error, 
    // and rejected if we encounter error while closing popup indicating the popup was blocked 
    let popup_check=await Promise.all(['',''].map((link,i) =>{
        const wnd = window.open(link, `connectWindow${i}`, "width=75,height=50,scrollbars=yes");
        return new Promise((resolve,reject) => {
            try {
                wnd.close();
                resolve(1);                                 // resolve if no error encountered
            } catch (err) {
                reject();                                   // reject if error encountered
            }
        });
    })).catch(()=>{
        alert('Please allow pop-ups and retry.');           // error means popup blocked, show alert to allow popups
        removeProgress();
        btn_wrapper.classList.remove('is-active');
    });
    
    // resolved promise will return 1, hence sum of resulting array should equal length of array, this was done in developement phase to check if code is running fine
    // if any one of the promises reject, Promise.all rejects and returns undefined to popup_check, when tried .reduce/.length on undefined object,
    // we get error, which is caught and function is returned without going forward
    try {
        if(popup_check.reduce((a, b) => a + b, 0)!=popup_check.length){
            alert('Please allow pop-ups and retry.');
            return;
        }
    } catch (error) {
        return;
    }

    // download list of selected tracks
    const text_download=document.createElement('a');
    text_download.style.display='null';
    text_download.setAttribute('download', 'Downloaded Tracks.txt');
    text_download.href = makeTextFile([...selected_songs].map(song =>song.title).join(' \n'));
    document.body.appendChild(text_download);
    text_download.click();
    document.body.removeChild(text_download);

    removeProgress();
    download_btn.classList.add('progress-70');

    // this is the code which runs every download link in a new popup and downloads the tracks
    // its done this way since the youtube_mp3_converter returns a page which needs to be loaded to download the mp3
    // and I cant load it in an iframe as this gives "Refused to display in a frame because it set 'X-Frame-Options' to 'SAMEORIGIN'" error
    // basically the api gives a link which is not allowed to be opened in an iframe, hence I am using pop-ups to download the track
    Promise.all(downloadLinks.map(async (songLink,i) =>{
        const wnd = window.open(songLink, `connectWindow${i}`, "width=450,height=200,scrollbars=yes");          // opens the track download link in a new popup
        await waitStart(wnd);                               // waits till the page is loaded
        return new Promise((resolve,reject) => {
            setTimeout(function () {                        // close popup after certain time, onload cant be used due to Same-origin policy
                try {
                    wnd.close();
                    resolve();                              // fail safe, if the window not closed, i.e popup blocked
                } catch (err) {
                    reject(err);
                }
            }, 5400+1000*i);
        });
    }))
    .catch((err)=>{
        removeProgress();
        btn_wrapper.classList.remove('is-active');
        console.log(err);
        alert('Please allow pop-ups and retry.');           // show alert to allow popups
    });
    
    download_btn.removeEventListener('click',downloader);   // remove listener for click
    removeProgress();
    download_btn.classList.add('progress-100');             // make progress as 100%
    setTimeout(function() {
        btn_wrapper.classList.add('dl-completed');          // show download complete animation
        btn_wrapper.classList.add('animation-ended');
    }, 1200);
});


function waitStart(wnd) {
    return new Promise((resolve,reject)=>{
        setInterval(() => {
            if(wnd.length==1)                               // window.length becomes 1 when page loaded
                resolve();
        }, 100);
    });
}
