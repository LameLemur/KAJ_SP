# KAJ_Semestralni Prace

To run locally just run
```
node server.js
```

and open localhost:3000 in your browser

if you want to deply it you have to change the io socket address in public/js/script.js to you servers address

I recommend running the app in docker container eg.

```
docker run -d -v __app_dir__:/app --restart=unless-stopped --name kaj_sp -p 3000:3000 node:14 node /app/server.js
```
