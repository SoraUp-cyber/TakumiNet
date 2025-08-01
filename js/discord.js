document.getElementById('discordBtn').addEventListener('click', () => {
    const clientId = '1397287228744532162';
    const redirectUri = encodeURIComponent('http://127.0.0.1:5502/pages/index.html'); // Igual al portal
    const scope = encodeURIComponent('identify email');

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    
    window.location.href = authUrl;
});