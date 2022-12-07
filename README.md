# Spotify Playlist Download

A simple web-app which takes in a spotify playlist url and lets you select tracks to download from that playlist.

## Description and Working

Open [this](https://im-utkarsh.github.io/spotify-playlist-download/) link in any browser and paste your spotify playlist (make sure the playlist is set as public). It will fetch the playlist from spotify and show tracks it contains. Select the tracks you want to download and click download to start downloading. Along with the tracks, it will also download a txt file containing the selected tracks.<br>
The app works by fist making a request to the spotify api to get all the tracks contained in the playlist. Then it makes request to youtube api to get a youtube video corrosponding to every song title present in the playlist. Following that, download links for every mp3 corrosponding to the videos are generated using a  youtube-to-mp3 api. The links provided by the free version of the api are needed to be opened one by one, and hence a popup is created which closes automatically after some time (probably the download starts in that interval😅).

## How I build this project

This is a static site made using plain HTML, CSS and vanilla JavaScript. Most of the time for this project has been spend on the JavaScript part which I will try to unfold here.

### Request and Response for Spotify API

* I have used Client Credentials Flow as the authentication flow for this project since user information is not required to retrieve the playlist. Hence, authorization is not required making it ideal for this project.
  More about this can be found on [spotify authentication guide](https://developer.spotify.com/documentation/general/guides/authorization/).
* To achieve this, a POST request is required to be made to the spotify api with the `client_id` and `client_secret_it`, which returns an `access_token` accessable for 1 hour.
  ```javascript
    client_id = 'CLIENT_ID:CLIENT_SECRET';         // encoded in base64

    response = await fetch("https://accounts.spotify.com/api/token", {
        method: 'POST',
        headers: {
        'Authorization': 'Basic '+client_id,
        'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'grant_type':'client_credentials',
        }),
    });
    api_key = await response.json().then(data => data.token_type+" "+data.access_token);
  ```
* This `access_token` is saved in the cookies (set to expire after 1 hour), so that POST request is not made unnecessary.
* After `access_token` is requested, playlist fetching starts.
  ```javascript
    await fetch(`https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
    {
        method: 'GET',
        headers: {
            'Authorization': spotify_key,
            'Content-Type': 'application/json'
        }
    }).then(res=>res.json());
  ```
* This results with a list of all the tracks in the playlist. Extract the track titles, artists, and images & add them dynamically to the html.
* Finally display them using grid for responsive UI.
  ```css
    .playlistContainer{
        display: grid;
        grid-template-columns: repeat(auto-fill,minmax(120px,1fr));
    }
  ```

### Request and Response for Youtube API

* When the download button is clicked, a text file is generated which writes every downloaded track in that file and downloads it for user.
* Then the youtube api is called, with search querry as title and artist of track, it returns video id of the first search result for every track.
  ```javascript
    await fetch(`https://youtube.googleapis.com/youtube/v3/search?type=video&part=snippet&q=${song.title}&maxResults=1&key=${apikey}`)
    .then(res=>res.map(ele=>ele.items[0].id.videoId));
  ```

### Request and Response for youtube-mp3-download

* This api requires a videoId of youtube video, and generated a link which can be used to download the mp3 version of that video. The api can be found [here](https://rapidapi.com/ytjar/api/youtube-mp3-download1/discussions/29759).
* The link generated is not a direct link, rather it's needed to be opened in brouser  to start download. Moreover the link is not accessable in iframe due to Same-origin policy.
* To overcome this, I used pop-ups, but since I can't access the elements of this page (to check if loading finished and downloading started), I close the tab after a fixed interval of time.
  ```javascript
    window.open(songLink, `connectWindow${i}`, "width=450,height=200,scrollbars=yes");           // opens link in new popup
    await waitStart(wnd);       // waits till the window is open
    // returns a promise which closes the window after certain time
    // if error encountered while closing the window, means popup was already blocked by brouser(default behaviour)
    //in this case one can show a javascript alert to notify user to allow popups
    return new Promise((resolve,reject) => {
        setTimeout(function () {
            try {
                wnd.close();
                resolve();
            } catch (err) {
                reject(err);
            }
        }, waitTime);
    });
  ```

## Problems

* The first problem is regarding youtube api quota which is partially fixed by using multiple api keys.
* The main problem with this web app is that all the downloads are not certainly captured.<br>
  Since popups with timeout are used, there no way of knowing if the popup page was loaded and the download started.<br>
  This can be fixed by using an api which results with direct link for the mp3 rather than an indirect link.

## Conclusion

This was a small project solely made by me, to brush-up and update my css/javascript skills along with learning how fetch API works. The project contains some problems which can be addressed by giving some more time and resources.

## Acknowledgments

Inspiration, code snippets, etc.
* [Spotify API](https://developer.spotify.com/) - Api for spotify
* [Youtube API v3](https://developers.google.com/youtube/v3) - Api for youtube search querry
* [Youtube MP3 Download API](https://rapidapi.com/ytjar/api/youtube-mp3-download1) - Api to get download mp3 links from youtube video id
* [Stack Overflow](https://stackoverflow.com/) - most of the javascript related stuff
* [Input group :focus-within](https://codepen.io/aaroniker/pen/dybMVMB) - general color palet and initial design
* [Loading](https://codepen.io/kathykato/pen/YzKGrqd) - loading animation
* [404 Page Not Found](https://codepen.io/joaosousa/pen/ZEEKWmv) - error animation
* [Animated Download Button](https://codepen.io/ChucKN0risK/pen/GqMeZz) - download button animation

<br>

---

<br>

Utkarsh Chauhan  
[@UTK_CHAUHAN](https://twitter.com/UTK_CHAUHAN)
