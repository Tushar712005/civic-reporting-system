import React, { useState, useEffect } from 'react';

function ReportForm() {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (err) => setLocationError(`Error getting location: ${err.message}`)
      );
    } else {
      setLocationError('Geolocation is not supported by this browser.');
    }
  }, []);

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!location) {
      setError('Location is required. Please allow location access.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('latitude', location.latitude);
    formData.append('longitude', location.longitude);
    if (photo) {
      formData.append('photo', photo);
    }

    // --- NEW DEBUGGING LOGS (in the browser) ---
    console.log("--- Preparing to send this data ---");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    console.log("---------------------------------");
    // --- End of logs ---

    try {
      const response = await fetch('http://localhost:5000/api/issues', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Network response was not ok');

      setSuccess(true);
      setTitle('');
      setPhoto(null);
      setPhotoPreview('');
      document.getElementById('file-upload').value = null; // Clear file input
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to submit report:', error);
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Report a Civic Issue</h1>
          <p className="text-gray-500 mt-2">Help improve your community by reporting issues.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Issue Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
            <input type="text" id="title" name="title" placeholder="e.g., Large Pothole on Main St" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <div className="flex items-center justify-center w-full p-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
              {location && <p className="text-green-600 text-sm font-medium">Location captured successfully!</p>}
              {locationError && <p className="text-red-600 text-sm">{locationError}</p>}
              {!location && !locationError && <p className="text-gray-500 text-sm">Detecting location...</p>}
            </div>
          </div>
          
          {/* Photo Upload */}
          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">Upload Photo</label>
            <div className="mt-1 flex items-center space-x-4">
              <div className="flex-shrink-0 h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <svg className="h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </div>
              <label htmlFor="file-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <span>Select file</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handlePhotoChange} />
              </label>
            </div>
          </div>

          <div>
            <button type="submit" disabled={isSubmitting || !location} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

        {success && <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-center">Report submitted successfully!</div>}
        {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">{error}</div>}
      </div>
    </div>
  );
}

export default ReportForm;

