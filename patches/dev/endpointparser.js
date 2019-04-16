export default function() {
    if (window.location.hostname.indexOf("dev.") >= 0 || window.location.hostname === "localhost") {
        return [
            "https://api.yoursharedsecret.com/dev"
        ];
    } else {
        return [
            "https://api.yoursharedsecret.com/v1",
            "https://api-send-2.yoursharedsecret.com/v1",
            "https://api-send-3.yoursharedsecret.com/v1"
        ];
    }
}