# Class Diagram — TrAvelIt

Struktur kelas dipisah tiga namespace: Domain (entitas database), Layanan Aplikasi (logika bisnis), dan Integrasi Eksternal (AI, peta, validator). Belah ketupat penuh menandai komposisi: Trip → Itinerary → ItineraryDay → Activity.

```mermaid
classDiagram
    direction LR

    namespace Domain {
        class User {
            +int id
            +string name
            +string email
            +string password
            +string role
        }

        class Trip {
            +int id
            +int userId
            +string title
            +string destination
            +string originCity
            +date startDate
            +date endDate
            +int durationDays
            +int budget
            +int travelerCount
            +string status
            +string lastError
        }

        class Preference {
            +int id
            +int tripId
            +text interests
            +string pace
            +text specialNeeds
            +interestList() string[]
        }

        class Itinerary {
            +int id
            +int tripId
            +int version
            +int totalEstimatedCost
            +string currency
            +string modelUsed
            +datetime generatedAt
        }

        class ItineraryDay {
            +int id
            +int itineraryId
            +int dayNumber
            +date date
            +string summary
        }

        class Activity {
            +int id
            +int itineraryDayId
            +int orderNo
            +string startTime
            +string name
            +string category
            +int estimatedCost
            +float lat
            +float lng
            +bool placeVerified
            +float distanceKmFromPrev
            +int travelMinutesFromPrev
        }

        class Destination {
            +int id
            +string name
            +string category
            +string city
            +string province
            +int ticketPrice
            +float lat
            +float lng
            +int createdBy
        }

        class Article {
            +int id
            +string title
            +string caption
            +text content
            +int createdBy
        }

        class ChatMessage {
            +int id
            +int userId
            +string role
            +text content
            +bool hasImage
        }
    }

    namespace LayananAplikasi {
        class TripService {
            +createAndGenerate(userId, input)
            +regenerate(userId, tripId)
            +getTrip(userId, tripId)
            +listTrips(userId)
            +updateTrip(userId, tripId, patch)
            +deleteTrip(userId, tripId)
            -bangunPrompt()
            -verifikasiTempat()
            -simpanVersi()
        }

        class ChatService {
            +sendMessage(userId, message)
            +identifyPlace(userId, image, note)
            +getHistory(userId)
            +clearHistory(userId)
        }

        class ArticleService {
            +getAllArticles()
            +createArticle(data)
            +updateArticle(id, data)
            +deleteArticle(id)
        }

        class DestinationService {
            +getAllDestinations(query)
            +createDestination(data)
            +updateDestination(id, data)
            +deleteDestination(id)
            +getDestinationStats()
            -lengkapiKoordinat()
        }

        class BrowseDestinationService {
            +getRecommendations(quizAnswers)
        }

        class AuthService {
            +registerUser(data)
            +loginUser(kredensial)
        }
    }

    namespace IntegrasiEksternal {
        class GeminiService {
            +generate()
            +chat()
            +generateJson()
            +generateCaption()
            +generateDescription()
            +callWithRetry()
            +pesanRamah()
        }

        class GeoService {
            +geocode(query)
            +reverseGeocode(lat, lng)
            +haversineKm(a, b)
            +estimateTravelMinutes(km)
            -antre() 1 req per detik
        }

        class ItinerarySchema {
            +RESPONSE_SCHEMA
            +validateItinerary()
            +normalizeCategory()
            +isValidCoordinate()
        }
    }

    User "1" --> "0..*" Trip
    User "1" --> "0..*" ChatMessage
    User "1" --> "0..*" Destination
    User "1" --> "0..*" Article

    Trip "1" *-- "1" Preference
    Trip "1" *-- "0..*" Itinerary
    Itinerary "1" *-- "1..*" ItineraryDay
    ItineraryDay "1" *-- "1..*" Activity

    TripService ..> Trip
    TripService ..> ItinerarySchema
    TripService ..> GeminiService
    TripService ..> GeoService

    ChatService ..> ChatMessage
    ChatService ..> GeminiService

    ArticleService ..> Article
    ArticleService ..> GeminiService

    DestinationService ..> Destination
    DestinationService ..> GeminiService
    DestinationService ..> GeoService

    BrowseDestinationService ..> Destination
    BrowseDestinationService ..> GeminiService

    AuthService ..> User
```
