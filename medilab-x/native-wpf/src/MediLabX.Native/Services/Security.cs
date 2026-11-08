using System.Security.Cryptography;
using MediLabX.Native.Models;
namespace MediLabX.Native.Services;
public static class Security {
 public static string Hash(string password){byte[] salt=RandomNumberGenerator.GetBytes(16);byte[] hash=Rfc2898DeriveBytes.Pbkdf2(password,salt,210000,HashAlgorithmName.SHA256,32);return "pbkdf2-sha256:210000:"+Convert.ToBase64String(salt)+":"+Convert.ToBase64String(hash);}
 public static bool Verify(string password,string stored){try{var p=stored.Split(':');if(p.Length!=4||p[0]!="pbkdf2-sha256")return false;int rounds=int.Parse(p[1]);if(rounds<100000||rounds>1000000)return false;var salt=Convert.FromBase64String(p[2]);var expected=Convert.FromBase64String(p[3]);var actual=Rfc2898DeriveBytes.Pbkdf2(password,salt,rounds,HashAlgorithmName.SHA256,expected.Length);return CryptographicOperations.FixedTimeEquals(expected,actual);}catch{return false;}}
 public static LocalUser? Login(Store store,string user,string password)=>store.All<LocalUser>("users").FirstOrDefault(x=>x.UserName.Equals(user.Trim(),StringComparison.OrdinalIgnoreCase)&&Verify(password,x.PasswordHash));
 public static bool CanVisit(LocalUser u,string page)=>u.Role.Equals("Admin",StringComparison.OrdinalIgnoreCase)||page=="About"||(!new[]{"Admin & Users","Settings"}.Contains(page)&&u.Permissions.Contains(page,StringComparer.OrdinalIgnoreCase));
}